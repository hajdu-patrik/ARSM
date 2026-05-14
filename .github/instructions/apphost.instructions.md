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
- Use `WithReference` + `WaitFor` correctly where the downstream resource must wait for infrastructure readiness.
- Keep config-first ports/endpoints/secrets.
- Keep WebUI API endpoint injected via env; no hardcoded URL.
- Orchestrator routes AppHost source changes through the backend/platform specialist path.
- Use `Aspire.Hosting.JavaScript` and `AddJavaScriptApp("webui", "../AutoService.WebUI", "dev")` for the Vite client.
- Add the API project by path with resource name `apiservice`; do not reintroduce an AppHost compile-time `ProjectReference` just for orchestration.
