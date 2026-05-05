---
applyTo: tests/**
description: Use when editing API (.http) and Database (.sql) test suites under tests/. Enforces chunked layout, env-driven credentials, non-reusable test data, and read-only SQL verification policy.
---
# Tests Instructions

## Persona
- Testing/security: Zsombor
- Architecture oversight: Patrik

## Enforce
- Keep chunked suite layout (`tests/API/**`, `tests/Database/**`).
- Credentials via env vars only; generated data must be runtime-unique.
- SQL files are read-only verification (`SELECT` only, no DML/DDL).
- Keep this file synced with `tests/CLAUDE.md`.

## Test Design Standards
- Keep tests readable and focused; one responsibility per scenario block.
- Avoid giant test files and high-coupling setup.
- Use explicit intent in scenario naming and assertions.

## Size Guardrails
- Preferred test file size <= 180 lines.
- Hard limit: > 250 lines must be split by scenario.

## Trigger Gates
- `http-endpoint-test` / `sql-database-test` / `e2e-playwright-test` run only on:
  - explicit user request, or
  - significant feature/structural behavior change.
- If a new feature triggers these agents, generate missing coverage first.
- Non-behavioral changes default: docs-sync only for test-layer docs.
