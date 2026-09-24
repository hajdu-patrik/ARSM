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
  replaced, and local paths are masked.
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
  (the WebUI no-shadow invariant), frontend (`tsc -b --noEmit` + eslint on the changed files), backend
  (`dotnet build`), and security (`npm audit fix` + `npm audit --audit-level=high`, `dotnet list package
  --vulnerable --include-transitive`) only when a manifest or lockfile changed or with `--security`.
  Exit 0 pass, 1 fail, 2 git error; report `tests/.artifacts/validate-summary.json`. Timeout per command:
  `ARSM_VALIDATE_TIMEOUT_SECONDS` (default 300).
- `select-e2e-specs.py`: maps the WebUI diff to the Playwright specs that cover it (`FEATURE_SPECS`,
  changed specs, and the specs that import a changed page object); any file outside those rules selects
  the full suite. Prints the selection, or runs it through the canonical runner with `--run`.

## Validation

- Validate script behavior from repository root when practical.
- If script behavior changes setup or test workflow, update both `README.md` and `README(HU).md`.
