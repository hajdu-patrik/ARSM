"""Disposable PostgreSQL + RustFS containers and the API process; everything is removed on exit."""

from __future__ import annotations

import http.client
import os
import shutil
import signal
import ssl
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Any

from .constants import (
    API_READY_SECONDS, DATABASE_NAME, INFRA_HOST, INFRA_READY_ATTEMPTS, POLL_SECONDS, POSTGRES_CONTAINER,
    POSTGRES_HOST_PORT, POSTGRES_IMAGE, READER_ROLE, S3_CONTAINER, S3_HOST_PORT, S3_IMAGE,
)
from .environment import APP, Context
from .launch import LaunchEndpoint, port_in_use
from .steps import StepFailure

LOG_TAIL_LINES = 40
STOP_GRACE_SECONDS = 15


def http_ok(url: str) -> bool:
    """GET without proxies and without certificate checks (the dev certificate is self-signed)."""
    insecure = ssl.create_default_context()
    insecure.check_hostname = False
    insecure.verify_mode = ssl.CERT_NONE
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=insecure))
    try:
        with opener.open(url, timeout=5) as response:
            return 200 <= response.status < 300
    except (OSError, ValueError, http.client.HTTPException):
        return False


class DisposableStack:
    """Context manager that owns the two throwaway containers and the API process tree."""

    def __init__(self, ctx: Context) -> None:
        self.ctx = ctx
        self.docker = shutil.which("docker") or "docker"
        self.api_process: subprocess.Popen[bytes] | None = None
        self.workdir = Path(tempfile.mkdtemp(prefix="arsm-prepush-"))
        self.log_path = self.workdir / "api.log"

    def __enter__(self) -> "DisposableStack":
        self.remove_containers()
        return self

    def __exit__(self, *_exc: Any) -> None:
        self.close()

    def _docker(self, args: list[str], environment: dict[str, str] | None = None, input_text: str | None = None) -> Any:
        return self.ctx.runner.run("docker", [self.docker, *args], APP, environment or self.ctx.environment, input_text)

    def remove_containers(self) -> None:
        """Remove the two containers and their anonymous volumes; missing ones are fine."""
        self._docker(["rm", "-f", "-v", POSTGRES_CONTAINER, S3_CONTAINER])

    def start_infrastructure(self) -> None:
        for port in (POSTGRES_HOST_PORT, S3_HOST_PORT):
            if port_in_use(port):
                raise StepFailure(f"Host port {port} is already in use; the pre-push stack needs it.")
        creds = self.ctx.credentials
        postgres_env = {**self.ctx.environment, "POSTGRES_PASSWORD": creds.postgres_password}
        s3_env = {**self.ctx.environment, "RUSTFS_ACCESS_KEY": creds.s3_access_key, "RUSTFS_SECRET_KEY": creds.s3_secret_key}
        runs = (
            (["run", "-d", "--name", POSTGRES_CONTAINER, "-p", f"{POSTGRES_HOST_PORT}:5432", "-e", "POSTGRES_PASSWORD", POSTGRES_IMAGE], postgres_env),
            (["run", "-d", "--name", S3_CONTAINER, "-p", f"{S3_HOST_PORT}:9000", "-e", "RUSTFS_ACCESS_KEY", "-e", "RUSTFS_SECRET_KEY", S3_IMAGE], s3_env),
        )
        for args, environment in runs:
            result = self._docker(args, environment)
            if result.return_code != 0:
                raise StepFailure(f"docker run failed for {args[3]}.", result.stderr.splitlines()[-10:])
        self._wait_infrastructure()

    def _wait_infrastructure(self) -> None:
        for _ in range(INFRA_READY_ATTEMPTS):
            # TCP (-h) so the init-time socket-only server does not count as ready.
            postgres = self._docker(["exec", POSTGRES_CONTAINER, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"])
            if postgres.return_code == 0 and http_ok(f"http://{INFRA_HOST}:{S3_HOST_PORT}/health"):
                return
            time.sleep(POLL_SECONDS)
        logs = [line for name in (POSTGRES_CONTAINER, S3_CONTAINER) for line in self._docker(["logs", "--tail", "10", name]).stdout.splitlines()]
        raise StepFailure("PostgreSQL or RustFS did not become ready.", logs[-20:])

    def start_api(self, environment: dict[str, str], endpoint: LaunchEndpoint) -> None:
        # --urls (after --, for the app) beats the profile's applicationUrl, so the gate API never takes the dev port.
        command = [shutil.which("dotnet") or "dotnet", "run", "--project", "AutoService.ApiService", "--launch-profile", "https",
                   "--", "--urls", endpoint.url]
        flags = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
        with self.log_path.open("wb") as log:
            self.api_process = subprocess.Popen(command, cwd=APP, env=environment, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, **flags)
        deadline = time.monotonic() + API_READY_SECONDS
        while time.monotonic() < deadline:
            if self.api_process.poll() is not None:
                raise StepFailure(f"The API exited with code {self.api_process.returncode} before it became ready.", self.api_log_tail())
            if http_ok(f"{endpoint.url}/health"):
                return
            time.sleep(POLL_SECONDS)
        raise StepFailure(f"The API did not answer {endpoint.url}/health in {API_READY_SECONDS}s.", self.api_log_tail())

    def create_reader_role(self) -> None:
        """Read-only SQL test account, the same grants as the tests.yml step."""
        quote, dquote = chr(39), chr(34)
        password = self.ctx.credentials.sql_reader_password
        sql = (
            f"CREATE ROLE {READER_ROLE} LOGIN PASSWORD {quote}{password}{quote};\n"
            f"GRANT CONNECT ON DATABASE {dquote}{DATABASE_NAME}{dquote} TO {READER_ROLE};\n"
            f"GRANT USAGE ON SCHEMA public TO {READER_ROLE};\n"
            f"GRANT SELECT ON ALL TABLES IN SCHEMA public TO {READER_ROLE};\n"
        )
        args = ["exec", "-i", POSTGRES_CONTAINER, "psql", "-U", "postgres", "-d", DATABASE_NAME, "-v", "ON_ERROR_STOP=1"]
        result = self._docker(args, input_text=sql)
        if result.return_code != 0:
            raise StepFailure("Creating the read-only SQL account failed.", (result.stdout + result.stderr).splitlines()[-10:])

    def api_log_tail(self) -> list[str]:
        try:
            text = self.log_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return []
        return [self.ctx.sanitizer.sanitize(line) for line in text.splitlines() if line.strip()][-LOG_TAIL_LINES:]

    def close(self) -> None:
        """Stop the API tree, remove containers and the temp dir; Ctrl+C is ignored while this runs."""
        previous = signal.signal(signal.SIGINT, signal.SIG_IGN)
        try:
            for cleanup in (self._stop_api, self.remove_containers):
                try:
                    cleanup()
                except Exception as error:  # one failed cleanup must not skip the others
                    self.ctx.say(f"[WARN] cleanup step failed: {type(error).__name__}")
            shutil.rmtree(self.workdir, ignore_errors=True)
            self.ctx.say("[INFO] Disposable stack removed (API stopped, containers and volumes deleted).")
        finally:
            signal.signal(signal.SIGINT, previous)

    def _stop_api(self) -> None:
        process = self.api_process
        if process is None:
            return
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        else:
            self._signal_group(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=STOP_GRACE_SECONDS)
        except subprocess.TimeoutExpired:
            if os.name != "nt":
                self._signal_group(process.pid, signal.SIGKILL)
            process.kill()
            process.wait(timeout=STOP_GRACE_SECONDS)

    @staticmethod
    def _signal_group(pid: int, sig: int) -> None:
        try:
            os.killpg(pid, sig)
        except ProcessLookupError:
            pass
