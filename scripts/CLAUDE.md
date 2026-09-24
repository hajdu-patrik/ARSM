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
- `update-model-policy.py`: rewrites the generated model-policy table between the
  `<!-- model-policy:start/end -->` markers in the root `CLAUDE.md` from the Anthropic Models API
  (newest Sonnet, Opus and Fable model plus their supported effort levels); the tier rules are the
  owner's policy in `FAMILY_POLICIES`. Writes only on change; `--dry-run` prints the block. Needs
  `ANTHROPIC_API_KEY`; exit 2 when a family is missing or its policy effort is unsupported, so a bad
  catalog never reaches `main`. Run daily at 12:00 Europe/Budapest by `.github/workflows/model-policy.yml`,
  which pushes a changed table straight to `main` under the latest commit's author identity.

## Validation

- Validate script behavior from repository root when practical.
- If script behavior changes setup or test workflow, update both `README.md` and `README(HU).md`.
