# AutoService.AppHost — Aspire Orchestration Rules

## Principles
- AppHost is the default local entry point. Run with `dotnet run --project AutoService.AppHost` from `app`.
- Use `WithReference(...)` to wire dependencies. Use `WaitFor(...)` to enforce startup ordering.
- Keep resource names stable and deterministic when adding new resources.

## PostgreSQL
- Resource: `postgres`, database: `AutoServiceDb`.
- Compatible connection key: `ConnectionStrings:AutoServiceDb`.
- Port source: `appsettings.json` → `Ports:Postgres` (single source of truth).
- Persistent data volume: `autoservice-postgres-data`.
- PostgreSQL container sets `PGGSSENCMODE=disable`.

## API Service
- Wire with reference to PostgreSQL database.
- API must wait for the database (`WaitFor`).
- API environment includes `JwtSettings__Secret` and `PGGSSENCMODE=disable`.

## WebUI Service
- Wire with reference to the API service.
- Inject `VITE_API_URL` from `apiService.GetEndpoint("https")` — never hardcode.
- WebUI port source: `appsettings.json` → `Ports:WebUi`, passed as `PORT` env var.
- WebUI runs over HTTPS (`WithHttpsEndpoint`) with Vite's `vite-plugin-mkcert`.
- Enable external HTTP endpoints for local development.

## Secrets & Parameters
- `postgres-password` — PostgreSQL server password (secret parameter, stored in user secrets).
- `jwt-secret` — JWT signing secret injected into API service as `JwtSettings__Secret` (secret parameter).

## Avoid
- Hardcoding URLs, ports, or credentials in code — use env vars and Aspire wiring.
- Introducing unnecessary orchestration resources.
