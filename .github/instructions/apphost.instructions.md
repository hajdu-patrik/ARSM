---
applyTo: "AutoServiceApp/AutoService.AppHost/**"
description: "Use when editing Aspire orchestration and resource wiring in AutoService.AppHost."
---
# AutoService.AppHost Instructions

## Orchestration Principles

- Keep AppHost as the default local entry point.
- Wire dependencies with `WithReference(...)` and enforce startup ordering with `WaitFor(...)` when required.
- Keep resource names stable and deterministic.

## Database (PostgreSQL)

- Keep PostgreSQL wiring compatible with existing connection key `ConnectionStrings:AutoServiceDb`.
- Resource: `postgres`, database: `AutoServiceDb`.
- Port must come from AppHost configuration key `Ports:Postgres` (single source of truth).
- Persistent data volume: `autoservice-postgres-data`.

## API Service (Backend)

- Wire API service with reference to PostgreSQL database.
- Ensure API starts after database is ready using `WaitFor()`.
- API endpoint is available for WebUI reference.

## WebUI Service (Frontend)

- Wire WebUI service with reference to API service.
- Inject `VITE_API_URL` environment variable from API endpoint: `apiService.GetEndpoint("https")`.
- This allows frontend to call backend without hardcoding URLs.
- WebUI endpoint port must come from AppHost configuration key `Ports:WebUi` and be passed as `PORT`.
- Enable external HTTP endpoints for local development.

## Development Notes

- To run locally: `dotnet run --project AutoService.AppHost` from `AutoServiceApp` root.
- AppHost manages all resource initialization and wiring.
- Logs and container outputs can be viewed in the Aspire dashboard.
- Keep local fixed ports in `AutoService.AppHost/appsettings.json` under `Ports` and update there only.

## Avoid

- Introducing unnecessary orchestration resources.
- Hardcoding URLs, ports, or credentials in code (use environment variables via Aspire instead).

