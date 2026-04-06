> **Architecture Notice:** This project uses both Claude Code and GitHub Copilot as the primary agentic AI tools. When establishing new architectural patterns, ensure they remain compatible with the Copilot instructions located in the `.github/` directory.

# ARSM (AutoService) Project - Global Guidelines

This repository hosts the **ARSM** (Appointment and Resource Scheduling Management) full-stack application — a mechanic-facing workshop management tool for auto service businesses.
**Goal:** Prioritize maintainable, domain-safe, and incremental changes that align strictly with the existing architecture.

## Technology Baseline
- **Backend:** .NET 10 (C# 15) ASP.NET Core Web API + Entity Framework Core.
- **Frontend:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS exclusively.
- **Orchestration:** .NET Aspire (`AutoService.AppHost` & `AutoService.ServiceDefaults`).
- **Database:** PostgreSQL managed via Aspire orchestration.

## Architecture Navigation
Specific instructions and conventions are decentralized. Claude will automatically read these when navigating into the respective directories:
- **Backend API & Domain:** See `@AutoServiceApp/AutoService.ApiService/CLAUDE.md`
- **Aspire Orchestration:** See `@AutoServiceApp/AutoService.AppHost/CLAUDE.md`
- **Frontend UI:** See `@AutoServiceApp/AutoService.WebUI/CLAUDE.md`
- **Service Defaults:** See `@AutoServiceApp/AutoService.ServiceDefaults/CLAUDE.md`

## Team & Operations Core Rules
- **Configuration-First Addressing:** Never hardcode runtime fallback URLs. Local ports and service endpoints must exclusively reside in configuration files (`appsettings.json`, `launchSettings.json`, `.env.development`).
- **Conflict Prevention:** For parallel work, respect folder-level ownership to prevent merge conflicts.
- **Documentation Sync (Mandatory):** After any change that affects API endpoints, EF migrations, middleware pipeline, WebUI pages/components/routes, dependencies (NuGet or npm), AppHost resource wiring, or configuration keys — run `/docs-sync` before considering the task complete. This keeps all `CLAUDE.md` and `.github/instructions/` files in sync with the actual code.
- **Endpoint Test Sync (Mandatory):** After any API endpoint is added/changed/removed, run `/endpoint-tests-sync` to keep endpoint test suites synchronized in `AutoServiceApp/AutoService.ApiService/api-tests/*.http` and `docs/Database Testing/*.sql`.