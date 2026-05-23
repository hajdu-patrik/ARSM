---
applyTo: "app/AutoService.AppHost/**"
description: "Use when editing Aspire AppHost resource wiring and local runtime composition."
---
# AppHost Instructions

## Enforce

- Keep deterministic resource wiring and naming.
- Use `WithReference(...)` and `WaitFor(...)` correctly.
- Keep config-first ports/endpoints/secrets.
- Keep WebUI API URL injection from AppHost endpoint wiring.

## Required Wiring

- Keep API resource name `apiservice`.
- Keep WebUI integration via `AddJavaScriptApp("webui", "../AutoService.WebUI", "dev")`.
- Keep secret parameters explicit: `postgres-password`, `jwt-secret`.

## Runtime Anchors

- Aspire dashboard default `https://localhost:17094`.
- Postgres/WebUI ports come from config (`50000`, `5173` defaults).
- API endpoint is Aspire-assigned (default `https://localhost:5200`).

## Validation

- Build AppHost after changes.
- Keep parity with `app/AutoService.AppHost/CLAUDE.md`.
