![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

# ARSM - Appointment and Resource Scheduling Management

**ARSM** is a mechanic-facing workshop management tool built for auto service businesses. It helps mechanics organize their daily repair schedules, claim appointments, and track job progress through a clean, responsive dashboard.

**Use ARSM when you need to:**

- View and manage repair's appointments at a glance
- Claim unassigned appointments and update their status in real time
- Browse a monthly calendar overview of all scheduled work
- Coordinate mechanic workloads across your workshop

Built as a full-stack application with ASP.NET Core Web API (backend), React + TypeScript (frontend), and PostgreSQL (database), orchestrated via .NET Aspire for streamlined local development.

---

## Language

- English: this file
- Hungarian: [README(HU).md](https://github.com/hajdu-patrik/ARSM/blob/main/README(HU).md)

---

## AI-Assisted Development

This project uses two agentic AI tools side by side: **Claude Code** (CLI/desktop) and **GitHub Copilot** (VS Code). Both share aligned instruction sets and specialist agents so that either tool can work on any part of the codebase with identical constraints.

### Specialist Agents

Every implementation task is delegated to specialist agents via an orchestrator. The orchestrator analyzes the request, creates a phased plan, and dispatches work to the appropriate specialists — which can run in parallel when independent.

| Agent | Scope | Purpose |
| ----- | ----- | ------- |
| **Orchestrator** | Task decomposition | Analyzes every task first, decides which specialists work in which phases |
| **Backend** | `AutoService.ApiService` | Endpoints, domain model, DTOs, auth, middleware, EF queries |
| **Frontend** | `AutoService.WebUI` | Components, pages, stores, services, i18n, routing, styling |
| **Migration** | EF Core | Creates, validates, and troubleshoots database migrations |
| **Docs Sync** | Documentation | Syncs all instruction files with current code after every change |
| **Coding Principles** | Code style & quality | Enforces JSDoc comments, naming conventions, and structural quality across changed files |
| **HTTP Endpoint Test** | .http test files | Updates HTTP endpoint test suites after API changes |
| **SQL Database Test** | .sql validation files | Updates SQL validation suites after schema changes |
| **E2E Playwright** | Playwright E2E tests | Maintains Playwright test suites, updates page objects when UI changes |
| **Validate** | Build check | Runs `dotnet build` + `npx tsc --noEmit` and reports pass/fail |

**Standard workflow:**

1. Orchestrator decomposes the task into phases
2. Backend + Frontend specialists execute in parallel
3. Validate agent checks the build
4. Docs Sync agent updates project documentation
5. Coding Principles agent enforces code style and quality
6. HTTP Endpoint Test agent syncs .http test suites
7. SQL Database Test agent syncs .sql validation suites
8. E2E Playwright agent updates Playwright tests when UI or DTO changes affect the UI

Agent definitions:

- Claude Code: `.claude/agents/*.md`
- GitHub Copilot: `.github/agents/*.agent.md`

### Skills (Agent Runbooks)

Reusable runbooks consumed by specialist agents. Agents are the primary interface — invoke agents, not skills directly.

| Skill | Used by agent | Purpose |
| ----- | ------------- | ------- |
| `autoservice-docs-sync` | `docs-sync` | Synchronize all CLAUDE.md, .github/instructions, and ARSM-TL-DR.md with code |
| `autoservice-coding-principles` | `coding-principles` | Enforce JSDoc comments, naming conventions, and structural quality |
| `autoservice-http-endpoint-test` | `http-endpoint-test` | Update .http test suites after endpoint changes |
| `autoservice-sql-database-test` | `sql-database-test` | Update .sql validation suites after schema changes |
| `autoservice-ef-migration` | `migration` | EF Core migration workflow and troubleshooting |
| `autoservice-e2e-playwright` | `e2e-playwright` | Update Playwright E2E tests after UI/DTO changes |

Skill sources: `.github/skills/*/SKILL.md`

### SQL Read-Only Policy (AI)

- For AI-assisted SQL validation, use the dedicated PostgreSQL account `ai_agent_test_user`.
- This account is read-only by design and may only run `SELECT` queries.
- Never run `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, or `GRANT/REVOKE` through AI-assisted SQL tooling.
- Use privileged/admin DB credentials only for intentional manual maintenance operations.

### Instruction Files

Domain rules are maintained in parallel for both tools:

| Claude Code | GitHub Copilot |
| ----------- | -------------- |
| `CLAUDE.md` (root) | `.github/copilot-instructions.md` |
| `app/*/CLAUDE.md` | `.github/instructions/*.instructions.md` |

---

## Authentication (High Level)

- Authentication is based on ASP.NET Core Identity + JWT, with backend-managed HttpOnly cookie sessions.
- Access and refresh tokens are stored in secure HttpOnly cookies, with refresh token rotation and server-side persistence (hashed).
- Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/validate`.
- Appointment endpoints: `GET /api/appointments`, `GET /api/appointments/today`, `POST /api/appointments/intake`, `PUT /api/appointments/{id}`, `PUT /api/appointments/{id}/claim`, `DELETE /api/appointments/{id}/claim`, `PUT /api/appointments/{id}/status`, `PUT /api/appointments/{id}/assign/{mechanicId}` (AdminOnly), `DELETE /api/appointments/{id}/assign/{mechanicId}` (AdminOnly), `POST /api/customers/{customerId}/appointments` (AdminOnly).
- Dashboard access is for mechanics only. After login, mechanics land on a Scheduler page where the top summary strip reflects the selected day (or today when no day is selected), alongside the monthly calendar view, intake quick section, and monthly appointment list.
- Sensitive operational/security details are intentionally not published in this README.

---

## Run with Aspire

```Bash
cd app
dotnet run --project AutoService.AppHost
```

This starts the orchestrated local environment (API + infrastructure + related services).

---

## Local CI/CD With act

To avoid the commit-push-fail cycle while developing workflows, run GitHub Actions locally with `act`.

### Prerequisites

- Docker Desktop (or another running Docker daemon)
- `act` installed

### Install act

- Windows (Chocolatey): `choco install act-cli`
- Windows (Scoop): `scoop install act`
- macOS (Homebrew): `brew install act`
- Linux: `curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash`

### Typical Commands

Run from repository root:

```bash
act -l
act
act -W .github/workflows/dotnet.yml
act -j build
act pull_request -j playwright-e2e --secret-file .secrets
```

### Local Secrets For act

Create a local `.secrets` file (already ignored by `.gitignore`) and provide required values:

```text
ARSM_TEST_MECHANIC_EMAIL=...
ARSM_TEST_MECHANIC_PASSWORD=...
ARSM_TEST_WRONG_PASSWORD=...
ARSM_TEST_CUSTOMER_EMAIL=...
```

### Notes

- The workflow uses `ubuntu-latest`, which `act` can simulate well.
- The `playwright-e2e` job needs Docker + local secret values.
- First run may ask for runner image size selection; `Medium` is usually enough.
