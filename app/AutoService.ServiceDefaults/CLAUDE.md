# AutoService.ServiceDefaults Rules

## Scope and Ownership

- Architecture authority: Patrik
- Backend/platform execution: Mark
- QA/security escalation: Zsombor
- Scope: shared defaults only (telemetry, resilience, health, service discovery).
- No business/domain feature logic.

## Core Rules

- Keep defaults generic and reusable.
- Keep behavior config-driven; avoid service-specific hardcoding.
- Preserve compatibility with AppHost and ApiService startup patterns.

## Engineering Rules

- Apply SOLID/OOP boundaries in extension/config helpers.
- Split oversized artifacts: source > 500, class/service > 300, method target <= 60.
- Document rationale for non-trivial default/pipeline changes.

## Validation

- Verify no feature-specific logic leaked in.
- Verify startup compatibility remains intact.
- Keep docs parity with `.github/instructions/servicedefaults.instructions.md`.
