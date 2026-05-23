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

## Validation

- Validate script behavior from repository root when practical.
- If script behavior changes setup or test workflow, update both `README.md` and `README(HU).md`.
- Keep parity with `.github/instructions/scripts.instructions.md`.
