# AutoService.ServiceDefaults Rules

## Persona

- Architecture authority: Patrik
- Backend/platform execution: Mark
- QA/security escalation: Zsombor

## Scope

- Shared defaults only: telemetry, resilience, service discovery, and health behavior.
- Cross-service startup composition helpers used by backend services.
- No application feature/domain logic.

## Engineering Standards

- Enforce SOLID/OOP boundaries for extension methods.
- Keep one clear responsibility per extension/config helper.
- Use reusable composition patterns only when they reduce duplication.
- Include rationale for non-trivial defaults changes.

## Core Rules

- Keep defaults generic and reusable.
- Keep OpenTelemetry/resilience/health defaults enabled unless explicitly required otherwise.
- Keep behavior config-driven; avoid hardcoded runtime assumptions.
- Preserve compatibility with AppHost + ApiService startup patterns.

## Decomposition Guardrails

- No god files/classes/methods.
- Source files > 500 lines must be split.
- Class/service > 300 lines must be split by responsibility.
- Method/function target <= 60 lines where practical.

## Change Validation Checklist

1. Shared-defaults scope confirmed (no feature-specific logic leaked in).
2. Startup compatibility confirmed for AppHost/ApiService integration points.
3. Telemetry/resilience/health behavior remains deterministic and documented.
4. Counterpart docs remain aligned (`.github/instructions/servicedefaults.instructions.md`).
5. `docs-sync` + `coding-principles` expected in workflow for source changes.
