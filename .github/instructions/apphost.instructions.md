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

## Operational Anchors (Runtime Defaults)
- **Aspire dashboard**: `https://localhost:17094` (default; configured via Aspire SDK).
- **Postgres port**: configured via `Ports:Postgres` in `appsettings.json` (default `50000`).
- **WebUI port**: configured via `Ports:WebUi` in `appsettings.json` (default `5173`).
- **API HTTPS endpoint**: auto-assigned by Aspire (default `https://localhost:5200`).
- **Secret parameters**: `postgres-password`, `jwt-secret` (passed as Aspire parameters, read from user-secrets or environment).
- **Resource wiring order**: `postgres` -> `postgresDb` -> `apiservice` (waits for DB) -> `webui` (references API endpoint).
