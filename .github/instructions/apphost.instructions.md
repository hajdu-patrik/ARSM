---
applyTo: "app/AutoService.AppHost/**"
description: "Use when editing Aspire orchestration and resource wiring in AutoService.AppHost."
---
# AppHost Instructions (Condensed)

## Persona
- Architecture: Patrik
- Backend/platform: Mark
- QA/security: Zsombor

## Enforce
- Keep deterministic Aspire resource wiring.
- Use `WithReference` + `WaitFor` correctly.
- Keep config-first ports/endpoints/secrets.
- Keep WebUI API endpoint injected via env; no hardcoded URL.
