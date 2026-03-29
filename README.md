![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

# AutoService - Appointment and Resource Management System

AutoService is a full-stack application using ASP.NET Core Web API for the backend, React + TypeScript for the frontend, and PostgreSQL as the database. The system runs on a .NET Aspire orchestration layer to simplify local development, observability, and container-based workflows.

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

Skill sources:

- `.github/skills/autoservice-mcp-context-policy/SKILL.md`
- `.github/skills/autoservice-config-driven-endpoints/SKILL.md`
- `.github/skills/autoservice-ef-migration/SKILL.md`

---

## Authentication (High Level)

- Authentication is JWT-based via ASP.NET Core Identity.
- Dashboard access is for mechanics only.
- Sensitive operational/security details are intentionally not published in this README.

---

## Run with Aspire

```Bash
cd AutoServiceApp
cd AutoService.AppHost
dotnet run
```

This starts the orchestrated local environment (API + infrastructure + related services).