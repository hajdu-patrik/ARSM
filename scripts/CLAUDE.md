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

- `run-local-test-suite.py`: canonical local test runner (`all|playwright|http|sql`).
- `migrate-profile-pictures-to-object-storage.py`: verifies every stored profile-picture object key
  resolves to a real object in object storage. Reuses the runner's secret loading and output
  masking, and delegates the actual check to the API project's `--migrate-profile-pictures`
  entrypoint so verification reads the bucket the same way the serving path does. `--verify` is
  accepted for backwards compatibility; verification runs either way. Read-only: touches neither
  the database nor the bucket. Report: `tests/.artifacts/profile-picture-migration-summary.json`.

## Validation

- Validate script behavior from repository root when practical.
- If script behavior changes setup or test workflow, update both `README.md` and `README(HU).md`.
- Keep parity with `.github/instructions/scripts.instructions.md`.
