---
applyTo: "app/AutoService.ServiceDefaults/**"
description: "Use when editing shared service defaults, health checks, resilience, and OpenTelemetry settings."
---
# ServiceDefaults Instructions

## Persona
- Architecture: Patrik
- Backend/platform: Mark
- QA/security: Zsombor

## Scope
- Shared cross-service defaults only (`AutoService.ServiceDefaults`).
- Health, resilience, service-discovery, and telemetry configuration patterns.
- No business-domain behavior or feature-specific logic.

## Engineering Standards
- Apply SOLID/OOP boundaries for extension methods and configuration helpers.
- Keep responsibilities explicit: configuration composition, not application feature orchestration.
- Use pattern-based extension only when it reduces duplication across services.
- Document rationale for non-trivial default/pipeline changes.

## Enforce
- Keep defaults generic and reusable across API/AppHost consumers.
- Preserve telemetry/resilience/health defaults unless explicitly required to change.
- Keep behavior config-first (environment/config keys over hardcoded runtime behavior).
- Keep startup integration compatible with existing `AddServiceDefaults` and endpoint mapping usage.

## Decomposition Guardrails
- No god files/classes/methods.
- Source files > 500 lines must be split.
- Class/service > 300 lines must be split by responsibility.
- Methods/functions should target <= 60 lines where practical.

## Validation Workflow
1. Verify change belongs to shared defaults scope.
2. Check compatibility impact on ApiService/AppHost startup behavior.
3. Ensure no service-specific assumptions leaked into shared defaults.
4. Ensure docs remain synchronized (`app/AutoService.ServiceDefaults/CLAUDE.md`).
5. Run `docs-sync` and `coding-principles` in the workflow when source changed.
