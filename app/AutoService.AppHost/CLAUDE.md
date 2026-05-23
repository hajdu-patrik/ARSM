# AutoService.AppHost Rules

## Scope and Ownership

- Architecture authority: Patrik
- Backend/platform execution: Mark
- QA/security escalation: Zsombor

## Core Rules

- AppHost is the local composition entrypoint.
- Keep deterministic resource naming and wiring.
- Use `WithReference(...)` and `WaitFor(...)` correctly.
- Keep config-first ports/endpoints/secrets.
- Never hardcode secrets/URLs.

## Required Wiring Contract

- Keep API resource name `apiservice`.
- Keep WebUI as JavaScript app: `AddJavaScriptApp("webui", "../AutoService.WebUI", "dev")`.
- Keep `VITE_API_URL` injected from API endpoint.
- Keep explicit Aspire secret params: `postgres-password`, `jwt-secret`.

## Runtime Anchors

- Aspire dashboard default: `https://localhost:17094`.
- Postgres port from config (`Ports:Postgres`, default `50000`).
- WebUI port from config (`Ports:WebUi`, default `5173`).
- API endpoint auto-assigned by Aspire (default `https://localhost:5200`).

## Validation

- Build AppHost after changes.
- Keep docs parity with `.github/instructions/apphost.instructions.md`.
