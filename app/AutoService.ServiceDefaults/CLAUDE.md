# AutoService.ServiceDefaults — Shared Defaults

- Keep shared defaults generic and reusable across services.
- Keep OpenTelemetry and resilience defaults enabled unless there is a strong reason to change them.
- Keep health endpoint mapping behavior explicit and environment-aware.
- Avoid service-specific business logic in this project.
- Preserve compatibility with AppHost and ApiService startup conventions.

## Usage in ApiService

- `builder.AddServiceDefaults()` is called at the top of `Program.cs` (before service registration). Registers OpenTelemetry, health checks, and service discovery defaults.
- `app.MapDefaultEndpoints()` is called last in endpoint mapping. Maps `/health` and `/alive` in the Development environment only.
