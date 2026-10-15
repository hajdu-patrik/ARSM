# Scripts Rules

## Scope

- Applies to `scripts/**`.
- Primary owner: Zsombor.
- Architecture escalation: Patrik.

## Mandatory Rules

- Keep scripts safe, deterministic, and automation-focused.
- Prefer Python for cross-platform automation unless shell is clearly simpler.
- Use env/config-driven values; never hardcode secrets, credentials, or local-only hosts.
- Never print sensitive values to stdout/stderr.
- Keep one clear responsibility per script.
- Any destructive behavior must be explicit, documented, and guarded.
- Expose clear usage (`--help` or equivalent), actionable errors, and stable exit codes.

## Current Scripts

- `run-local-test-suite.py`: canonical local test runner (`all|playwright|http|sql`). Behaviour that
  HTTPYAC cannot express is registered in `PYTHON_HTTP_CHECKS` (profile picture upload, appointment SSE,
  quote line cap, quote PDF) rather than invoked separately; each entry reports under its own key in the
  sanitized summary. Every captured line passes the sanitizer first: loaded secret values, Postgres URIs,
  secret-shaped assignments and secret-named JSON fields (cookie, set-cookie, accessToken and friends) are
  replaced, and local paths are masked. `tests/API/_setup/*.http` runs as its own HTTPYAC command before the
  full suite (httpyac file order is not stable, and a fresh database has no plain test mechanic and no shared fixtures yet);
  `setupPassed` reports it. HTTPYAC runs with `--output short --filter only-failed`, and every
  failed request is listed under `failedHttpRequests` (file, line, title, actual status - never bodies or
  headers); a regex fallback in `httpyac_summary.py` still finds them when the sanitizer breaks the JSON.
- `migrate-profile-pictures-to-object-storage.py`: verifies every stored profile-picture object key
  resolves to a real object in object storage. Reuses the runner's secret loading and output
  masking, and delegates the actual check to the API project's `--migrate-profile-pictures`
  entrypoint so verification reads the bucket the same way the serving path does. `--verify` is
  accepted for backwards compatibility; verification runs either way. Read-only: touches neither
  the database nor the bucket. Report: `tests/.artifacts/profile-picture-migration-summary.json`.
  The Playwright target passes `ARSM_E2E_SPECS` (space-separated spec paths, set by
  `select-e2e-specs.py --run`) through to `npm run e2e --`, and defaults `PLAYWRIGHT_WORKERS` to 3.
- `validate.py`: the deterministic validation gate that replaced the LLM `validate` stage. Scoped to the
  diff against `--base` (default `HEAD`, untracked files included) or the whole tree with `--all`; stages:
  size (source > 500, test > 250, C# type > 300 lines; migrations and designer files excluded), shadows
  (the WebUI no-shadow invariant; Tailwind `ring-*` utilities count as shadows because they render as
  `box-shadow`, bare `ring` only behind a variant prefix such as `focus:ring`), frontend (`tsc -b --noEmit`
  + eslint on the changed files), backend (`dotnet build`), and security (`npm audit fix` + `npm audit
  --audit-level=high` + `npm audit signatures`, `dotnet list package --vulnerable --include-transitive`)
  only when a manifest or lockfile changed or with `--security`.
  Exit 0 pass, 1 fail, 2 git error; report `tests/.artifacts/validate-summary.json`. Timeout per command:
  `ARSM_VALIDATE_TIMEOUT_SECONDS` (default 300).
- `pre-push.py` (helpers in `scripts/prepush/`): the local pre-push gate run by `.githooks/pre-push`
  (install: `git config core.hooksPath .githooks`; the hook always runs every stage). Usage:
  `python scripts/pre-push.py [--skip-e2e] [--skip-api-suites] [--only <validate|backend|frontend|e2e|api-suites>]`.
  Stages, fail fast: validate (`validate.py --all --security`), backend (locked restore, build, test, EF
  pending-model check), frontend (`npm ci` only when the lockfile differs from upstream, audit, tsc, lint,
  build), e2e (`select-e2e-specs.py --run`, diffed against the upstream ref), api-suites
  (`run-local-test-suite.py http sql` on throwaway `arsm-prepush-postgres` (port 15432) and
  `arsm-prepush-s3` (port 19000), with the API on its own `https://localhost:15200`, local secrets; always
  cleaned up). These ports sit below the Windows dynamic range (49152+), where outbound sockets once took the
  old 59000, and apart from the dev stack, so the gate runs beside a running AppHost. The suites run in-process so
  `.secrets` cannot override the throwaway stack; the stage needs `ARSM_TEST_ADMIN_EMAIL` and
  `ARSM_TEST_ADMIN_PASSWORD` in the local secrets, and aborts on a Bootstrap section in
  `appsettings.Local.json` and on an in-use gate API port. It never touches the dev database
  or `arsm-tunnel-*`. Prints a summary table; non-zero exit on failure. `git push --no-verify` is an
  exception only. The CI repo gate is `python scripts/validate.py --all --skip-build`.
- `select-e2e-specs.py`: maps the WebUI diff to the Playwright specs that cover it (`FEATURE_SPECS`,
  changed specs, and the specs that import a changed page object); any file outside those rules selects
  the full suite. Prints the selection, or runs it through the canonical runner with `--run`.

## Validation

- Validate script behavior from repository root when practical.
- If script behavior changes setup or test workflow, update both `README.md` and `README(HU).md`.
