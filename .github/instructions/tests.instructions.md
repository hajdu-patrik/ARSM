---
applyTo: tests/**
description: Use when editing API/SQL test suites under tests/ with env-driven credentials and read-only SQL policy.
---
# Tests Instructions

## Scope

- API suites: `tests/API/**/*.http`
- DB suites: `tests/Database/**/*.sql`
- Runner: `python scripts/run-local-test-suite.py [all|playwright|http|sql]`

## Trigger Gates

- Run heavy test agents only by explicit request or significant behavior changes.
- New feature + triggered test agent: generate missing coverage first.
- Non-behavioral changes: docs-sync only for test-layer docs.

## Core Rules

- Keep tests deterministic, focused, and chunked by responsibility.
- Size limits: preferred <= 180 lines, hard split > 250 lines.
- SQL policy: `ai_agent_test_user`, `SELECT` only, no DML/DDL.

## Secrets Policy

- Never hardcode credentials/hosts/connection strings.
- HTTP uses `tests/.env` with `{{$processEnv VAR}}`.
- Playwright uses `.secrets`.
- Template file is `tests/.env.example`.

## AI Reporting Contract

- Use `tests/.artifacts/test-suite-summary.json` as sanitized source.
- Never publish raw env/secrets/tokens/cookies/absolute paths/unsanitized logs.

## Coverage Anchors

- VIN/kW/drivetrain contract (no HP/torque fields).
- Customer list/search and scheduler lookup contracts.
- Scheduler intake + customer details/history split-view E2E expectations.
