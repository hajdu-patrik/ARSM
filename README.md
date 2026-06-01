# ARSM - Appointment and Resource Scheduling Management

![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

ARSM is a workshop scheduling and operations app for auto service teams. It helps mechanics and admins organize appointments, claim work, and track repair progress in one responsive dashboard.

## Language

- English: this file
- Hungarian: [README(HU).md](README(HU).md)

## Key Features

- Appointment intake and workshop scheduling
- Claim and unclaim flows for mechanics
- Real-time status updates across active jobs
- Monthly calendar view plus selected-day summary
- Role-aware behavior for mechanic and admin users

## Technology Stack

| Layer | Technologies |
| ----- | ------------ |
| Backend | .NET 10, ASP.NET Core Web API, EF Core, ASP.NET Core Identity, JWT |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Database | PostgreSQL |
| Orchestration | .NET Aspire (`AutoService.AppHost`) |

## Repository Layout

- `app/AutoService.ApiService`: API endpoints, domain model, EF Core, authentication
- `app/AutoService.WebUI`: React frontend
- `app/AutoService.AppHost`: Aspire orchestration (PostgreSQL + ApiService + WebUI)
- `app/AutoService.ServiceDefaults`: shared service defaults and resilience setup
- `tests/API`: HTTP endpoint test suites (`.http`)
- `tests/Database`: SQL validation suites (`.sql`, read-only policy)
- `docs`: additional technical and UI/UX documentation

---

## Quick Start (Recommended)

### Prerequisites

- .NET 10 SDK
- Node.js 20+ with npm
- Python 3.11+ for the local test runner
- Docker Desktop running locally (required for PostgreSQL container via AppHost)

### 1) Create local API settings

Use the committed template to create your local, gitignored API config:

```powershell
Copy-Item app/AutoService.ApiService/appsettings.Local.template.json app/AutoService.ApiService/appsettings.Local.json
```

or

```bash
cp app/AutoService.ApiService/appsettings.Local.template.json app/AutoService.ApiService/appsettings.Local.json
```

Then update placeholder values in `appsettings.Local.json`, especially:

- `JwtSettings.Secret`
- `ConnectionStrings.AutoServiceDb`
- `DemoData.MechanicPassword`

### 2) Restore tools and install frontend dependencies

```bash
dotnet tool restore --tool-manifest dotnet-tools.json
cd app/AutoService.WebUI
npm install
cd ../..
```

### 3) Run the full local stack

```bash
cd app
dotnet run --project AutoService.AppHost
```

AppHost starts and wires:

- PostgreSQL
- `AutoService.ApiService`
- `AutoService.WebUI` development server with `VITE_API_URL` injected from the API endpoint

## Useful Commands

| Task | Command |
| ---- | ------- |
| Build AppHost | `dotnet build app/AutoService.AppHost/AutoService.AppHost.csproj --verbosity minimal` |
| Build frontend | `cd app/AutoService.WebUI && npm run build` |
| Lint frontend | `cd app/AutoService.WebUI && npm run lint` |
| Run all local tests | `python scripts/run-local-test-suite.py` |
| Run selected local tests | `python scripts/run-local-test-suite.py playwright http sql` |

NuGet restore is lock-file based: `app/Directory.Build.props` enables locked restores, AppHost keeps RID-specific lock files for Aspire Dashboard/DCP packages on Linux and macOS, and CI runs `dotnet restore --locked-mode`.

## Running Tests

Use the Python runner from repository root. It loads `.secrets` and `tests/.env`, runs selected suites, and writes a sanitized summary to `tests/.artifacts/test-suite-summary.json`.
Each child command has a 300-second timeout by default; set `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` for slower local runs.

```bash
python scripts/run-local-test-suite.py
```

Run one or more suites by name:

```bash
python scripts/run-local-test-suite.py playwright
python scripts/run-local-test-suite.py http sql
```

Suite targets:

- `playwright`: runs the WebUI Playwright E2E suite (`PORT=5173` default).
- `http`: runs all `tests/API/**/*.http` suites through HTTPYAC.
- `sql`: runs all `tests/Database/**/*.sql` files against the running PostgreSQL container with the read-only SQL user.

Before full-suite runs, start Aspire in another terminal:

```bash
cd app
dotnet run --project AutoService.AppHost
```

Reports under `tests/.artifacts/` are gitignored and intended to remain sanitized for local debugging and AI review.

### AI Test Workflow

For full-test investigation, AI agents should run:

```bash
python scripts/run-local-test-suite.py
```

Then inspect `tests/.artifacts/test-suite-summary.json` and act in the matching layer (add missing coverage, fix stale tests, or investigate failures). Agents must not publish raw `.env` values, `.secrets` contents, connection strings, cookies, tokens, absolute local paths, or raw tool logs.

## Configuration and Secrets

- Never commit secrets, passwords, or local connection strings.
- Backend local secrets belong in `app/AutoService.ApiService/appsettings.Local.json` (gitignored).
- WebUI local env values belong in `app/AutoService.WebUI/.env.development` (template: `app/AutoService.WebUI/.env.development.template`).
- API test runtime values belong in `tests/.env` (template: `tests/.env.example`).
  - `ARSM_TEST_WEBUI_ORIGIN` must match a configured `Cors:AllowedOrigins` value because cookie-auth unsafe HTTP tests send an `Origin` header.
- Playwright runtime secrets belong in `.secrets` at repository root (gitignored); local E2E runs also set non-secret `PORT=5173` for Vite serve mode.
- MCP local runtime configs are `.claude/.mcp.json` and `.vscode/mcp.json` (both gitignored), created from `.claude/.mcp.template.json` and `.vscode/mcp.template.json`.
- MCP templates keep `ARSM_MCP_POSTGRES_CONNECTION_STRING` as the portable placeholder; local gitignored MCP profiles may hold the concrete read-only PostgreSQL URI for `ai_agent_test_user`.

## Deployment Security Notes

- Vite/Aspire WebUI hosting is local-development only. The Vite dev server binds to `localhost` by default; use `VITE_DEV_HOST` only for an explicit local LAN/container debugging opt-in.
- Production API hosting must configure `AllowedHosts` and `Cors:AllowedOrigins` with real non-localhost hosts. Non-Development startup rejects wildcard, localhost, non-HTTPS, malformed, or path-bearing WebUI origins.
- Auth login/refresh rate limits and login bans are process-local. Non-Development deployments must set `Deployment:RateLimiterTopology=SingleInstance` only when exactly one ApiService instance is running; use a distributed limiter before scaling out.
- The production WebUI static host or reverse proxy must enforce security headers because Vite is not the release server. Required headers include `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` or equivalent frame protection, and `Strict-Transport-Security` when TLS terminates there.
- The production WebUI static host should also enforce cache headers. Use [docs/deployment/nginx-webui-cache.conf](docs/deployment/nginx-webui-cache.conf) as the nginx reference: `index.html` is not cached, Vite `assets/` files are cached for 30 days with `immutable`, public images/icons are cached for 30 days with ETag revalidation, and manifest/sitemap/robots-style files use a shorter one-day cache.

## Contributor Notes (AI Workflow)

- Implementation is orchestrator-first, then routed to backend/frontend/migration specialists.
- Frontend implementation must run with `ui-ux-style-profile` as a mandatory pair.
- Build validation and docs sync are required after implementation.
- Security remediation is mandatory for code changes (`npm audit fix` for WebUI, vulnerable package checks for .NET).
- Detailed policy files:
  - Root: `CLAUDE.md`, `.github/copilot-instructions.md`
  - Area-specific rules: `app/*/CLAUDE.md`, `.github/instructions/*.instructions.md`

## SQL Read-Only Policy for AI Validation

- Dedicated AI SQL account: `ai_agent_test_user`
- Allowed statements: `SELECT` only
- Disallowed through AI tooling: `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`

## License

This repository is not MIT-licensed.

See [LICENSE.md](LICENSE.md) for the Custom Copyright Notice and Academic Use Policy.
