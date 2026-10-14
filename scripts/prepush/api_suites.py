"""API-suites stage: HTTP and SQL suites on a disposable stack, a local mirror of tests.yml api-http-sql."""

from __future__ import annotations

from .constants import DATABASE_NAME, POSTGRES_CONTAINER, READER_ROLE
from .credentials import build_api_environment
from .envtools import set_env
from .environment import ARTIFACTS, ROOT, Context
from .launch import LaunchEndpoint, default_webui_origin, preflight
from .stack import DisposableStack
from .steps import StageOutcome, StepFailure, run_action

SUITE_TARGETS = ["http", "sql"]
FAILED_TAIL_LINES = 15
SUITES_LABEL = "run HTTP and SQL suites"


def suite_environment(ctx: Context, endpoint: LaunchEndpoint) -> dict[str, str]:
    """Local test secrets stay as loaded; only the infra addressing points at the throwaway stack."""
    env = dict(ctx.environment)
    set_env(env, "AutoService_ApiService_HostAddress", endpoint.url)
    if not env.get("ARSM_TEST_WEBUI_ORIGIN", "").strip():
        set_env(env, "ARSM_TEST_WEBUI_ORIGIN", default_webui_origin())
    set_env(env, "ARSM_SQL_TEST_CONTAINER", POSTGRES_CONTAINER)
    # psql runs inside the container, so the connection string addresses its own port 5432.
    password = ctx.credentials.sql_reader_password
    set_env(env, "ARSM_MCP_POSTGRES_CONNECTION_STRING", f"postgresql://{READER_ROLE}:{password}@localhost:5432/{DATABASE_NAME}")
    return env


def run_suites(ctx: Context, endpoint: LaunchEndpoint) -> None:
    """Run the runner in-process: its CLI would reload .secrets and overwrite the throwaway addressing."""
    module = ctx.runner_module
    runner = module.LocalTestRunner(ROOT, ARTIFACTS, suite_environment(ctx, endpoint), ctx.sanitizer)
    results = runner.run_targets(SUITE_TARGETS)
    module.write_report(ROOT, ARTIFACTS, SUITE_TARGETS, results)
    failed = [result for result in results if result.status != "passed"]
    if not failed:
        return
    lines: list[str] = []
    for result in failed:
        lines.append(f"suite {result.name}: {result.status}")
        for item in result.details.get("failedHttpRequests", [])[:10]:
            lines.append(f"  {item.get('file')}:{item.get('line')} {item.get('title')} -> {item.get('actualStatus')}")
        lines.extend(f"  {line}" for line in result.output_tail[-FAILED_TAIL_LINES:])
    raise StepFailure("HTTP/SQL suites failed (details in tests/.artifacts/test-suite-summary.json).", lines)


def run(ctx: Context) -> StageOutcome:
    outcome = StageOutcome("api-suites")
    holder: dict[str, LaunchEndpoint] = {}

    def preflight_action() -> None:
        holder["endpoint"] = preflight(ctx)

    step = run_action(ctx, "preflight checks", preflight_action)
    outcome.steps.append(step)
    if step.status != "PASS":
        return outcome
    endpoint = holder["endpoint"]
    admin_email, admin_password = ctx.environment["ARSM_TEST_ADMIN_EMAIL"], ctx.environment["ARSM_TEST_ADMIN_PASSWORD"]
    api_env = build_api_environment(ctx.environment, ctx.credentials, admin_email, admin_password)
    with DisposableStack(ctx) as stack:
        actions = (
            ("start PostgreSQL and RustFS containers", stack.start_infrastructure),
            ("start the API (Development, empty database)", lambda: stack.start_api(api_env, endpoint)),
            ("create the read-only SQL test account", stack.create_reader_role),
            (SUITES_LABEL, lambda: run_suites(ctx, endpoint)),
        )
        for label, action in actions:
            step = run_action(ctx, label, action)
            outcome.steps.append(step)
            if step.status != "PASS":
                if label == SUITES_LABEL:  # earlier steps already carry the API log in their own failure lines
                    _print_api_log(ctx, stack)
                break
    return outcome


def _print_api_log(ctx: Context, stack: DisposableStack) -> None:
    for line in stack.api_log_tail()[-20:]:
        ctx.say(f"       api.log: {line}")
