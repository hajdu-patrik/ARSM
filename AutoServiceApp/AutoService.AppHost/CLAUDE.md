# AutoService.AppHost — Aspire Orchestration Rules

## Principles
- AppHost is the default local entry point. Run with `dotnet run --project AutoService.AppHost` from `AutoServiceApp`.
- Use `WithReference(...)` to wire dependencies. Use `WaitFor(...)` to enforce startup ordering.
- Keep resource names stable and deterministic when adding new resources.

## PostgreSQL
- Resource: `postgres`, database: `AutoServiceDb`.
- Compatible connection key: `ConnectionStrings:AutoServiceDb`.
- Port source: `appsettings.json` → `Ports:Postgres` (single source of truth).
- Persistent data volume: `autoservice-postgres-data`.

## API Service
- Wire with reference to PostgreSQL database.
- API must wait for the database (`WaitFor`).

## WebUI Service
- Wire with reference to the API service.
- Inject `VITE_API_URL` from `apiService.GetEndpoint("https")` — never hardcode.
- WebUI port source: `appsettings.json` → `Ports:WebUi`, passed as `PORT` env var.
- Enable external HTTP endpoints for local development.

## Avoid
- Hardcoding URLs, ports, or credentials in code — use env vars and Aspire wiring.
- Introducing unnecessary orchestration resources.
