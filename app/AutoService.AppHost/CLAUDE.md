# AutoService.AppHost Rules

## Persona

- Architecture authority: Patrik
- Backend/platform execution: Mark
- Security/validation escalation: Zsombor

## Core Rules

- AppHost is the local entrypoint.
- Keep deterministic resource names.
- Wire dependencies via `WithReference(...)` and readiness via `WaitFor(...)`.
- Keep config-first addressing (`Ports:*`, connection keys).
- No hardcoded secrets/URLs.

## Platform Policy

- Preserve PostgreSQL + API + WebUI wiring semantics.
- Keep WebUI `VITE_API_URL` injected from API endpoint.
- Keep secret parameters explicit (`postgres-password`, `jwt-secret`).
