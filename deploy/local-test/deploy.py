"""ARSM local test instance: rebuilds the arsm-tunnel-* stack when origin/main has a new green-CI commit.
Usage: python deploy.py [--force] [--ignore-ci] [--backup-only]; see deploy/docs/deployment-local-test.md."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime
from pathlib import Path

GITHUB_REPO = "hajdu-patrik/arsm"
REQUIRED_WORKFLOWS = (".NET", "Tests")
HERE = Path(__file__).resolve().parent
STATE = HERE / "deployed-sha.txt"
CI_STATE = HERE / "ci-state.txt"
LOCK = HERE / "deploy.lock"
LOG = HERE / "deploy.log"
MAX_LOG_BYTES = 256 * 1024
ERROR_STATE = HERE / "error-state.txt"
BACKUP_TRY = HERE / "backup-try.txt"
BACKUP_RETRY_SECONDS = 3600
BACKUPS = HERE / "backups"
KEEP_BACKUPS = 20
DAILY_BACKUP_SECONDS = 24 * 3600
NETWORK = "arsm-tunnel-net"
DATABASE = "AutoServiceDb"
# The task runs python.exe under conhost --headless; this flag keeps every git/docker call windowless in any host.
NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0


def log(message):
    try:
        if LOG.stat().st_size > MAX_LOG_BYTES:
            os.replace(LOG, LOG.with_suffix(".log.1"))  # one previous generation
    except OSError:
        pass
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(f"{datetime.now():%Y-%m-%d %H:%M:%S} {message}\n")


def run(args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=NO_WINDOW,
                            stdin=subprocess.DEVNULL, **kwargs)
    if result.returncode != 0:
        raise RuntimeError(f"{' '.join(map(str, args[:4]))} failed: {result.stderr.strip()[-600:]}")
    return result.stdout.strip()


def read_env(name):
    pairs = {}
    for line in (HERE / name).read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            pairs[key.strip()] = value.strip()
    return pairs


def repo_path():
    """ARSM_REPO from the environment or tunnel.env, else the repository this script lives in (deploy/local-test)."""
    configured = os.environ.get("ARSM_REPO") or read_env("tunnel.env").get("ARSM_REPO")
    if configured:
        return Path(configured)
    if (HERE.parents[1] / ".git").exists():
        return HERE.parents[1]
    raise RuntimeError("ARSM_REPO is not set; add ARSM_REPO=<repository path> to tunnel.env")


def exists(kind, name):
    return subprocess.run(["docker", kind, "inspect", name], capture_output=True, creationflags=NO_WINDOW).returncode == 0


def ci_status(sha):
    """Returns 'green', 'pending' or 'red' from the GitHub Actions push runs of the commit (public repo, no token)."""
    url = f"https://api.github.com/repos/{GITHUB_REPO}/actions/runs?head_sha={sha}&event=push&per_page=50"
    request = urllib.request.Request(url, headers={"User-Agent": "arsm-mini-prod-deploy", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(request, timeout=20) as response:
        runs = json.load(response)["workflow_runs"]
    latest = {}
    for item in sorted(runs, key=lambda r: r["run_attempt"]):
        latest[item["name"]] = item
    states = []
    for name in REQUIRED_WORKFLOWS:
        item = latest.get(name)
        if item is None or item["status"] != "completed":
            states.append("pending")
        else:
            states.append("green" if item["conclusion"] in ("success", "skipped", "neutral") else "red")
    return "red" if "red" in states else "pending" if "pending" in states else "green"


def note_ci(sha, status):
    """Logs a CI verdict once per commit and status instead of every 5 minutes."""
    key = f"{sha} {status}"
    if CI_STATE.exists() and CI_STATE.read_text(encoding="utf-8").strip() == key:
        return
    CI_STATE.write_text(key, encoding="utf-8")
    log(f"CI for {sha[:8]} is {status}; {'not deploying' if status == 'red' else 'waiting'}")


def backup(reason):
    """pg_dump (custom format) of the local test database; keeps the newest KEEP_BACKUPS files."""
    if not exists("container", "arsm-tunnel-postgres") or not exists("volume", "arsm-tunnel-pgdata"):
        return
    BACKUPS.mkdir(exist_ok=True)
    target = BACKUPS / f"{DATABASE}-{datetime.now():%Y%m%d-%H%M%S}-{reason}.dump"
    with target.open("wb") as handle:
        result = subprocess.run(["docker", "exec", "arsm-tunnel-postgres", "pg_dump", "-U", "postgres", "-Fc", DATABASE],
                                stdout=handle, stderr=subprocess.PIPE, creationflags=NO_WINDOW)
    if result.returncode != 0 or target.stat().st_size == 0:
        target.unlink(missing_ok=True)
        raise RuntimeError(f"pg_dump failed: {result.stderr.decode('utf-8', 'replace').strip()[-400:]}")
    for old in sorted(BACKUPS.glob(f"{DATABASE}-*.dump"))[:-KEEP_BACKUPS]:
        old.unlink()
    log(f"backup {target.name} ({target.stat().st_size // 1024} KiB)")


def daily_backup_due():
    """Filesystem checks only. After a failed attempt the next one waits an hour, so a stopped stack costs no docker calls."""
    if BACKUP_TRY.exists() and time.time() - BACKUP_TRY.stat().st_mtime < BACKUP_RETRY_SECONDS:
        return False
    dumps = sorted(BACKUPS.glob(f"{DATABASE}-*.dump")) if BACKUPS.exists() else []
    return not dumps or time.time() - dumps[-1].stat().st_mtime > DAILY_BACKUP_SECONDS


def ensure_base_services():
    """Creates the network, volumes, postgres and rustfs when missing; returns True on a fresh database."""
    if not exists("network", NETWORK):
        run(["docker", "network", "create", NETWORK])
    fresh = not exists("volume", "arsm-tunnel-pgdata")
    common = ["--network", NETWORK, "--restart", "unless-stopped", "--log-driver", "local"]
    if not exists("container", "arsm-tunnel-postgres"):
        run(["docker", "run", "-d", "--name", "arsm-tunnel-postgres", *common, "--env-file", str(HERE / "postgres.env"),
             "-v", "arsm-tunnel-pgdata:/var/lib/postgresql", "postgres:18.6"])
    if not exists("container", "arsm-tunnel-rustfs"):
        run(["docker", "run", "-d", "--name", "arsm-tunnel-rustfs", *common, "--env-file", str(HERE / "rustfs.env"),
             "-v", "arsm-tunnel-rustfs:/data", "rustfs/rustfs:1.0.1"])
    run(["docker", "start", "arsm-tunnel-postgres", "arsm-tunnel-rustfs"])
    return fresh


def image_id(name):
    result = subprocess.run(["docker", "image", "inspect", "-f", "{{.Id}}", name], capture_output=True, text=True, creationflags=NO_WINDOW)
    return result.stdout.strip() if result.returncode == 0 else None


def build_images(repo, sha, public_url):
    workdir = Path(tempfile.mkdtemp(prefix="arsm-deploy-"))
    try:
        archive = workdir / "src.tar"
        run(["git", "-C", str(repo), "archive", "--format=tar", "-o", str(archive), sha])
        context = workdir / "src"
        context.mkdir()
        run(["tar", "-xf", str(archive), "-C", str(context)])
        shutil.copytree(repo / "deploy", context / "deploy", dirs_exist_ok=True)
        shutil.copy2(repo / ".dockerignore", context / ".dockerignore")
        run(["docker", "build", "-q", "-f", "deploy/api.Dockerfile", "-t", "arsm-tunnel-api", "."], cwd=context)
        run(["docker", "build", "-q", "-f", "deploy/web.Dockerfile", "--build-arg", f"PUBLIC_URL={public_url}",
             "-t", "arsm-tunnel-web", "."], cwd=context)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def restart_app(public_url, admin_password):
    """Recreates api and web; the admin password is passed only for the first boot of an empty database."""
    common = ["--network", NETWORK, "--restart", "unless-stopped", "--log-driver", "local"]
    for name in ("arsm-tunnel-web", "arsm-tunnel-api"):
        if exists("container", name):
            run(["docker", "rm", "-f", name])
    if not exists("volume", "arsm-tunnel-dpkeys"):
        run(["docker", "volume", "create", "arsm-tunnel-dpkeys"])
    api_args = ["docker", "run", "-d", "--name", "arsm-tunnel-api", *common, "--env-file", str(HERE / "api.env"),
                "-v", "arsm-tunnel-dpkeys:/var/lib/arsm/dataprotection-keys",
                "-e", "DataProtection__Provider=FileSystem",
                "-e", "DataProtection__KeyDirectory=/var/lib/arsm/dataprotection-keys",
                "-e", f"Cors__AllowedOrigins__0={public_url}"]
    if admin_password:
        api_args += ["-e", f"Bootstrap__Admin__Password={admin_password}"]
    run([*api_args, "arsm-tunnel-api"])
    run(["docker", "run", "-d", "--name", "arsm-tunnel-web", *common, "-e", "API_UPSTREAM=http://arsm-tunnel-api:8080",
         "-p", "127.0.0.1:18080:8080", "arsm-tunnel-web"])


def answers(path):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:18080{path}", timeout=5) as page:
            return page.status == 200
    except Exception:
        return False


def healthy():
    """The web serves the SPA and the API answers its liveness probe (/alive) through the same proxy."""
    for _ in range(40):
        if answers("/") and answers("/alive"):
            return True
        time.sleep(3)
    return False


def tidy(old_images):
    """Drops the replaced arsm images and build cache older than a week; never touches other projects' images."""
    current = {image_id("arsm-tunnel-api"), image_id("arsm-tunnel-web")}
    for old in old_images - current - {None}:
        subprocess.run(["docker", "image", "rm", old], capture_output=True, creationflags=NO_WINDOW)
    subprocess.run(["docker", "builder", "prune", "-f", "--filter", "until=168h"], capture_output=True, creationflags=NO_WINDOW)


def deploy(repo, sha, deployed):
    tunnel = read_env("tunnel.env")
    log(f"deploying {sha[:8]} (was {deployed[:8] or 'none'})")
    if deployed:
        backup(f"pre-{sha[:8]}")
    old_images = {image_id("arsm-tunnel-api"), image_id("arsm-tunnel-web")}
    fresh = ensure_base_services()
    build_images(repo, sha, tunnel["PUBLIC_URL"])
    restart_app(tunnel["PUBLIC_URL"], tunnel["ADMIN_PASSWORD"] if fresh or not deployed else None)
    if healthy():
        STATE.write_text(sha, encoding="utf-8")
        log(f"deployed {sha[:8]}{' (fresh database, admin bootstrapped)' if fresh else ''}")
        tidy(old_images)
    else:
        log(f"deploy of {sha[:8]} is unhealthy; will retry on the next run")


def take_lock():
    """Atomic lock file; a lock older than an hour is stale and replaced."""
    for _ in range(2):
        try:
            os.close(os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
            return True
        except FileExistsError:
            try:
                if time.time() - LOCK.stat().st_mtime < 3600:
                    return False
                LOCK.unlink()
            except OSError:
                return False
    return False


def note_error(error):
    """Logs an error once until a different one (or a success) happens, so an offline machine does not fill the log."""
    text = str(error)
    if ERROR_STATE.exists() and ERROR_STATE.read_text(encoding="utf-8") == text:
        return
    ERROR_STATE.write_text(text, encoding="utf-8")
    log(f"ERROR {text}")


def main():
    force = "--force" in sys.argv
    if not take_lock():
        return
    try:
        if "--backup-only" in sys.argv:
            backup("manual")
            return
        repo = repo_path()
        # No prompts, no tags, no background gc/maintenance in the user's repo.
        run(["git", "-C", str(repo), "-c", "gc.auto=0", "-c", "maintenance.auto=false", "fetch", "--quiet", "--no-tags", "origin", "main"],
            timeout=180, env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
        sha = run(["git", "-C", str(repo), "rev-parse", "origin/main"])
        deployed = STATE.read_text(encoding="utf-8").strip() if STATE.exists() else ""
        if sha != deployed or force:
            status = "green" if "--ignore-ci" in sys.argv else ci_status(sha)
            if status == "green":
                deploy(repo, sha, deployed)
            else:
                note_ci(sha, status)
        if deployed and daily_backup_due():
            BACKUP_TRY.write_text("", encoding="utf-8")
            backup("daily")
        ERROR_STATE.unlink(missing_ok=True)
    except Exception as error:
        note_error(error)
    finally:
        LOCK.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
