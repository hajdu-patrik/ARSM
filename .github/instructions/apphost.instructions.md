---
applyTo: "AutoServiceApp/AutoService.AppHost/**"
description: "Use when editing Aspire orchestration and resource wiring in AutoService.AppHost."
---
# AutoService.AppHost Instructions

- Keep AppHost as the default local entry point.
- Wire dependencies with WithReference(...) and enforce startup ordering with WaitFor(...) when required.
- Keep resource names stable and deterministic.
- Keep PostgreSQL and API wiring compatible with existing connection key AutoServiceDb.
- Keep WebUI environment wiring through VITE_API_URL from apiService.GetEndpoint("https").
- Avoid introducing unnecessary orchestration resources unless clearly needed by the app.
