# ARSM - Appointment and Resource Scheduling Management

![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)

ARSM is a workshop scheduling and operations app for auto service teams: mechanics and admins
organize appointments, claim work, price jobs and send quotes in one responsive dashboard.

Hungarian version: [README(HU).md](README(HU).md)

## Features

- Appointment intake, monthly calendar and day view, claim/assign flows, live updates (SSE)
- Customers and vehicles with repair history
- Parts and labour catalog with VAT-aware net/gross prices
- Quotes per vehicle: part and labour lines, Draft -> Sent -> Accepted/Rejected, PDF, e-mail to the customer
- Company results by year and month
- Mechanic and admin roles, admin password reset, account lockout, CSRF and rate limits

## Technology

| Layer | Technologies |
| ----- | ------------ |
| Backend | .NET 10, ASP.NET Core, EF Core, ASP.NET Core Identity, JWT cookies, QuestPDF |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Data | PostgreSQL (18 locally, 17 in production), S3-compatible object store (RustFS locally, Azure Blob in production) |
| Orchestration | .NET Aspire (`app/AutoService.AppHost`) |

## Repository layout

| Path | Content |
| ---- | ------- |
| `app/AutoService.ApiService` | API, domain model, EF Core, authentication |
| `app/AutoService.WebUI` | React frontend and its Playwright E2E tests |
| `app/AutoService.AppHost`, `app/AutoService.ServiceDefaults` | Aspire orchestration and shared service defaults |
| `tests` | HTTP (`tests/API`), SQL (`tests/Database`), xUnit (`tests/AutoService.UnitTests`) and script tests |
| `scripts` | `validate.py` gate, `pre-push.py`, local test runner, `deploy-azure.py` |
| `deploy` | Azure production kit, local test instance kit, token gate; guides in `deploy/docs` |

## Run locally

Prerequisites: .NET 10 SDK, Node.js 24+, Python 3.11+, Docker Desktop.

1. Copy `app/AutoService.ApiService/appsettings.Local.template.json` to `appsettings.Local.json` (gitignored) and fill in
   `JwtSettings.Secret`, `ConnectionStrings.AutoServiceDb`, `CompanyProfile.*` (quote letterhead seed) and optionally
   `Bootstrap.Admin.*` (first admin on an empty database; the API seeds no other data).
2. Set the object store secrets once:
   `dotnet user-secrets set "Parameters:minio-user" "<user>"` and `"Parameters:minio-password" "<password>"` in `app/AutoService.AppHost`.
3. Install and start:

```bash
dotnet tool restore --tool-manifest dotnet-tools.json
cd app/AutoService.WebUI && npm install && cd ../..
cd app && dotnet run --project AutoService.AppHost
```

The AppHost starts PostgreSQL, RustFS, the API and the Vite dev server with `VITE_API_URL` injected.

## Checks and tests

| What | Command |
| ---- | ------- |
| Fast gate on the changed files (type check, lint, build, size limits, no-shadow rule) | `python scripts/validate.py` |
| Pre-push gate, the same stages as CI (install once: `git config core.hooksPath .githooks`) | `python scripts/pre-push.py` |
| Local suites against a running AppHost | `python scripts/run-local-test-suite.py [playwright\|http\|sql]` |
| Unit tests | `dotnet test` in `app/` |

Every push runs the pre-push gate; GitHub Actions repeats it (`.github/workflows/`), running the heavy jobs only for
the paths a change touches. Test reports go to `tests/.artifacts/` in sanitized form.

## Environments and releases

The local test instance was removed on 2026-11-13 to save resources; its kit stays in `deploy/local-test` and
`deploy/docs/deployment-local-test.md` describes how to set it up again. Until then step 2 below ends with the push.

| | `https://arsm.hu` (production) |
| --- | --- |
| Runs on | Azure Container Apps, PostgreSQL Flexible Server, Blob Storage |
| Updated | Manually, from a commit you choose |
| Data | Separate production database |
| Access | Token gate sidecar (`ARSM_PROD_GATE_TOKEN`) |

How a change goes out:

1. **Develop and check.** Work on a local branch, run `python scripts/validate.py`, add a `CHANGELOG.md` entry, then
   bring the commit onto `main`. The remote holds only `main`.
2. **Push = test release.** `git push origin main` first runs the pre-push gate (validate, backend, frontend, E2E, HTTP
   and SQL suites on throwaway containers). Once pushed, the scheduled task of the test kit (`deploy/local-test/deploy.py`,
   every 5 minutes) sees the new commit, backs up the test database, builds the API and web images from that commit
   (`git archive`), recreates the two app containers and waits until `/` and `/alive` answer. The API applies new
   migrations at startup, so the test instance runs the new version within a few minutes.
3. **Production release.** After checking it (on the test instance, when one is set up), run from the clone that holds the production `.env`
   (`az login` first): `python scripts/deploy-azure.py release --commit <sha>`. It builds and pushes the three images
   tagged with the commit, runs the `arsm-migrate` job (migrations and the `arsm_app` role) and only after it succeeds
   rolls `arsm-api` and `arsm-web` to new revisions. A failed migration stops the release with the old version still
   serving. Check with `curl -sS -o /dev/null -w "%{http_code}\n" https://arsm.hu/alive` (401 from the gate without the
   token), then sign in and try a quote PDF.

Dependencies are updated by hand following `.claude/skills/dependency-upgrade/SKILL.md`, along the same path.

Details: [deploy/docs/deployment-local-test.md](deploy/docs/deployment-local-test.md) (turning the test instance on
and off, backups) and [deploy/docs/deployment-azure.md](deploy/docs/deployment-azure.md) (the `.env` keys, first-time
setup, alerts, operations).

## Configuration and secrets

- Secrets never go into git: API settings in `appsettings.Local.json`, test values in `tests/.env` and `.secrets`,
  deployment and MCP values in the root `.env`; each has a tracked template (`*.template.json`, `*.example`).
- Production requires real `AllowedHosts` and `Cors:AllowedOrigins`, HTTPS and `Deployment:RateLimiterTopology=SingleInstance`
  (rate limits, login bans and session cutoffs are in-process).
- AI SQL tooling uses the read-only `ai_agent_test_user` (`SELECT` only).

## AI-assisted development

The repository is developed with Claude Code. The rules are in `CLAUDE.md` and the area `CLAUDE.md` files; larger tasks
run through the `arsm-chain` workflow (`.claude/workflows/arsm-chain.js`): an orchestrator splits the task into work
packages, agents implement and review them in parallel on models picked by the trirouter, then the `validate.py` gate
and the tests matching the diff run.

## License

This repository is not MIT-licensed. See [LICENSE.md](LICENSE.md) for the Custom Copyright Notice and Academic Use Policy.
