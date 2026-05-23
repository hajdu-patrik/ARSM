---
applyTo: "app/AutoService.ServiceDefaults/**"
description: "Use when editing shared service defaults: telemetry, resilience, service discovery, and health setup."
---
# ServiceDefaults Instructions

## Scope

- Shared defaults only.
- No feature-specific/domain logic.

## Enforce

- Keep defaults generic, reusable, and config-driven.
- Preserve startup compatibility with AppHost and ApiService.
- Keep OpenTelemetry/resilience/health behavior deterministic.

## Engineering Rules

- Apply SOLID/OOP boundaries in extension/config helpers.
- Split oversized artifacts (source > 500, class/service > 300, method target <= 60).
- Document rationale for non-trivial defaults changes.

## Validation

- Confirm no feature leakage into shared defaults.
- Confirm docs parity with `app/AutoService.ServiceDefaults/CLAUDE.md`.
