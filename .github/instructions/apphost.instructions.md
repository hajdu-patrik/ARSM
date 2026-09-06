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
- Keep secret parameters explicit: `postgres-password`, `jwt-secret`, `minio-user`, `minio-password`.
- Keep `apiservice` waiting on `minio` (`WaitFor(minio)`) and receiving `ObjectStorage__ServiceUrl`, `ObjectStorage__AccessKeyId`, `ObjectStorage__SecretAccessKey`, and `ObjectStorage__AutoCreateBucket` from the `minio` resource/params.

## Runtime Anchors

- Aspire dashboard default `https://localhost:17094`.
- Postgres/WebUI ports come from config (`50000`, `5173` defaults).
- Postgres container image tag is pinned in `AppHost.cs` via `WithImageTag`; a major-version change requires migrating the `autoservice-postgres-data` volume.
- Local S3-compatible object storage runs as the `minio` container (`minio/minio`, image tag pinned to `RELEASE.2025-09-07T16-13-09Z`), with API/console ports from config (`Ports:MinioApi` default `50001`, `Ports:MinioConsole` default `50002`) and a persistent `autoservice-minio-data` volume.
- API endpoint is Aspire-assigned (default `https://localhost:5200`).
- Keep AppHost NuGet lock files aligned per build host RID; Linux and macOS use the RID-specific `packages.lock.*.json` files for Aspire Dashboard/DCP packages.
- Dashboard/DCP stay NuGet-restored and lock-pinned (`AspireUseCliBundle=false`); `ASPIRE010` is suppressed in the csproj as a deliberate opt-out because the CLI bundle resolves from machine-local `~/.aspire` and is absent on clean CI runners.

## Validation

- Build AppHost after changes.
- Keep parity with `app/AutoService.AppHost/CLAUDE.md`.
