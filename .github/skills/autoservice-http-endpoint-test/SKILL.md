---
name: autoservice-http-endpoint-test
description: 'Maintain ARSM HTTP `.http` endpoint suites. Use when API endpoints, DTO validation, auth/role behavior, status/error contracts, tests/API files, or explicit HTTP test requests require coverage updates.'
---

Use this skill for `tests/API/**/*.http`.

## Trigger Gate

- Run only on explicit request or significant API contract/auth/validation change.
- Otherwise return `SKIPPED`.

## Required Behavior

- New feature + triggered gate: generate missing coverage first.
- Keep status/error/auth/validation expectations aligned to current API behavior.
- Keep credentials/env values from `tests/.env` via `{{$processEnv ...}}`.

## Execution

- Run with `python scripts/run-local-test-suite.py http`.
- Use only sanitized summary: `tests/.artifacts/test-suite-summary.json`.
