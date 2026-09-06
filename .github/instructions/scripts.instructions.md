---
applyTo: scripts/**
description: Use when editing automation scripts in scripts/ with safety, determinism, and env-driven configuration.
---
# Scripts Instructions

## Scope

- Applies to all files under `scripts/**`.

## Enforce

- Keep scripts safe, deterministic, and automation-focused.
- Prefer Python for cross-platform workflows unless shell is clearly simpler.
- Use env/config-driven behavior; never hardcode credentials/secrets.
- Never print sensitive values to stdout/stderr.
- Keep one clear responsibility per script.
- Any destructive side effect must be explicit, documented, and guarded.
- Return actionable errors and stable exit codes.
- Keep usage discoverable (`--help` or documented arguments).

## Current Scripts

- `run-local-test-suite.py`: canonical local test runner (`all|playwright|http|sql`).
- `migrate-profile-pictures-to-object-storage.py`: verifies every stored profile-picture object key
  resolves to a real object in object storage. Reuses the runner's secret loading and output
  masking, and delegates the actual check to the API project's `--migrate-profile-pictures`
  entrypoint so verification reads the bucket the same way the serving path does. `--verify` is
  accepted for backwards compatibility; verification runs either way. Read-only: touches neither
  the database nor the bucket. Report: `tests/.artifacts/profile-picture-migration-summary.json`.

## Validation

- Run from repository root when practical.
- If script behavior changes setup or test workflow, update `README.md` and `README(HU).md`.
- Keep parity with `scripts/CLAUDE.md`.
