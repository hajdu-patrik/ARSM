# AutoService.AppHost Rules

## Persona

- Architecture authority: Patrik
- Backend/platform execution: Mark
- Security/validation escalation: Zsombor

## Core Rules

- AppHost is the local entrypoint.
- Keep deterministic resource names.
- Wire dependencies via `WithReference(...)` and readiness via `WaitFor(...)` where the downstream resource must wait for infrastructure readiness.
- Keep config-first addressing (`Ports:*`, connection keys).
- No hardcoded secrets/URLs.
- Orchestrator routes AppHost source changes through the backend/platform specialist path.

## Platform Policy

- Preserve PostgreSQL + API + WebUI wiring semantics.
- Use `Aspire.Hosting.JavaScript` and `AddJavaScriptApp("webui", "../AutoService.WebUI", "dev")` for the Vite client.
- Add the API project by path with resource name `apiservice`; do not reintroduce an AppHost compile-time `ProjectReference` just for orchestration.
- Keep WebUI `VITE_API_URL` injected from API endpoint.
- Keep secret parameters explicit (`postgres-password`, `jwt-secret`).
