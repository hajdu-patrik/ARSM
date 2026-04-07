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
- Hungarian: [README(HU).md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/README(HU).md)

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
| **Docs** | Documentation | Syncs all instruction files with current code after every change |
| **Test Endpoints** | .http/.sql tests | Updates endpoint test suites after API changes |
| **Validate** | Build check | Runs `dotnet build` + `npx tsc --noEmit` and reports pass/fail |

**Standard workflow:**

1. Orchestrator decomposes the task into phases
2. Backend + Frontend specialists execute in parallel
3. Validate agent checks the build
4. Docs agent syncs all documentation; Test Endpoints agent syncs test suites

Agent definitions:

- Claude Code: `.claude/agents/*.md`
- GitHub Copilot: `.github/agents/*.agent.md`

### Skills (Slash Commands)

Reusable runbooks invoked via slash commands in both tools.

| Command | Purpose |
| ------- | ------- |
| `/docs-sync` | Synchronize all CLAUDE.md, .github/instructions, and ARSM-TL-DR.md with code |
| `/endpoint-tests-sync` | Update .http and .sql test suites after endpoint changes |
| `/ef-migration` | EF Core migration workflow and troubleshooting |
| `/config-driven-endpoints` | Enforce config-driven URL/port policy |
| `/mcp-context-policy` | MCP server interaction and Context Mode usage policy |

Skill sources: `.github/skills/*/SKILL.md`

### Instruction Files

Domain rules are maintained in parallel for both tools:

| Claude Code | GitHub Copilot |
| ----------- | -------------- |
| `CLAUDE.md` (root) | `.github/copilot-instructions.md` |
| `AutoServiceApp/*/CLAUDE.md` | `.github/instructions/*.instructions.md` |

---

## Authentication (High Level)

- Authentication is based on ASP.NET Core Identity + JWT, with backend-managed HttpOnly cookie sessions.
- Access and refresh tokens are stored in secure HttpOnly cookies, with refresh token rotation and server-side persistence (hashed).
- Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/validate`.
- Appointment endpoints: `GET /api/appointments`, `GET /api/appointments/today`, `PUT /api/appointments/{id}/claim`, `PUT /api/appointments/{id}/status`.
- Dashboard access is for mechanics only. After login, mechanics land on a Scheduler page with a planner space (today's appointments) and a monthly calendar view.
- Sensitive operational/security details are intentionally not published in this README.

---

## Run with Aspire

```Bash
cd AutoServiceApp
cd AutoService.AppHost
dotnet run
```

This starts the orchestrated local environment (API + infrastructure + related services).
