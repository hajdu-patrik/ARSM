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

## Copilot Skills (Quick Use)

Detailed agent policies are maintained as skills and prompts.

- `/mcp-context-policy` → MCP server usage and Context Mode interaction policy.
- `/config-driven-endpoints` → Fixed config-driven ports/URLs policy, no hardcoded endpoint fallback.
- `/ef-migration` → EF migration workflow and troubleshooting runbook.
- `/docs-sync` → Documentation synchronization policy and workflow.
- `/endpoint-tests-sync` → Endpoint HTTP/SQL test synchronization workflow after endpoint changes.

Skill sources:

- `.github/skills/autoservice-mcp-context-policy/SKILL.md`
- `.github/skills/autoservice-config-driven-endpoints/SKILL.md`
- `.github/skills/autoservice-ef-migration/SKILL.md`
- `.github/skills/autoservice-docs-sync/SKILL.md`
- `.github/skills/autoservice-endpoint-tests-sync/SKILL.md`

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