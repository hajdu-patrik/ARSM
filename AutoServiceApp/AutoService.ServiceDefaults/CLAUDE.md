# AutoService.ServiceDefaults — Shared Defaults

- Keep shared defaults generic and reusable across services.
- Keep OpenTelemetry and resilience defaults enabled unless there is a strong reason to change them.
- Keep health endpoint mapping behavior explicit and environment-aware.
- Avoid service-specific business logic in this project.
- Preserve compatibility with AppHost and ApiService startup conventions.
