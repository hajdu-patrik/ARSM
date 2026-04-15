# CLAUDE Guidelines

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

- **Backend API & Domain:** See `@app/AutoService.ApiService/CLAUDE.md`
- **Aspire Orchestration:** See `@app/AutoService.AppHost/CLAUDE.md`
- **Frontend UI:** See `@app/AutoService.WebUI/CLAUDE.md`
- **Service Defaults:** See `@app/AutoService.ServiceDefaults/CLAUDE.md`

## Specialist Agents (Mandatory Delegation)

This project uses specialist agents for both Claude Code (`.claude/agents/`) and GitHub Copilot (`.github/agents/`). **All implementation tasks must be delegated to specialist agents via the orchestrator** — never execute inline in the main conversation.

| Agent | Model | Scope | When to use |
| ----- | ----- | ----- | ----------- |
| `orchestrator` | sonnet | Task decomposition | **Always first** — analyzes every task and decides which specialists work on it in which phases |
| `backend` | sonnet | `AutoService.ApiService` | Endpoints, domain model, DTOs, auth, middleware, EF queries |
| `frontend` | sonnet | `AutoService.WebUI` | Components, pages, stores, services, i18n, routing, styling |
| `migration` | sonnet | EF Core migrations | Creating, validating, and troubleshooting migrations |
| `docs-sync` | sonnet | Documentation files | **Always runs after changes** — syncs CLAUDE.md, .github/instructions, copilot-instructions.md, ARSM-TL-DR.md |
| `code-docs-sync` | sonnet | Source-code comment style | Enforces JSDoc-style comments for changed classes/methods and removes XML doc comments |
| `test-endpoints` | sonnet | .http and .sql test files | After API endpoint add/change/remove |
| `validate` | haiku | Build + type-check | Fast post-change validation (backend build + frontend tsc) |

**Mandatory workflow:**
1. **Orchestrator first** — every task goes through the orchestrator for decomposition and phase planning.
2. **Specialist execution** — identified agents execute in parallel where possible.
3. **Validate** — always runs after code changes to catch build/type errors.
4. **Docs sync (always)** — the `docs-sync` agent must run after every change to synchronize all documentation files. If changes touch skills, agents, or instruction files, those are updated too.
5. **Code docs sync** — the `code-docs-sync` agent must run after class/method additions or changes.
6. **Test endpoints** — runs after any API endpoint change.

## Team & Operations Core Rules

- **Configuration-First Addressing:** Never hardcode runtime fallback URLs. Local ports and service endpoints must exclusively reside in configuration files (`appsettings.json`, `launchSettings.json`, `.env.development`).
- **Conflict Prevention:** For parallel work, respect folder-level ownership to prevent merge conflicts.
- **Documentation Sync (Mandatory):** After any change that affects API endpoints, EF migrations, middleware pipeline, WebUI pages/components/routes, dependencies (NuGet or npm), AppHost resource wiring, or configuration keys — run `/docs-sync` before considering the task complete. This keeps all `CLAUDE.md` and `.github/instructions/` files in sync with the actual code.
- **Code Documentation Style (Mandatory):** For new or changed non-trivial classes/methods, use JSDoc-style block comments. Do not use XML doc comments (`/// <summary>`, `/// <param>`, `/// <returns>`). Run `/code-docs-sync` when these code changes are introduced.
- **Endpoint Test Sync (Mandatory):** After any API endpoint is added/changed/removed, run `/endpoint-tests-sync` to keep endpoint test suites synchronized in `tests/API/**/*.http` and `tests/Database/**/*.sql`.
- **AI SQL Safety (Mandatory):** For AI-assisted database verification, use `ai_agent_test_user` and execute read-only `SELECT` queries only. Never run DML/DDL (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`) from AI SQL tooling.
- **Scheduler Doc Accuracy:** Keep frontend docs aligned with current scheduler UX details, including mobile calendar baseline alignment, auth-expired (`401/403`) vs generic load-toast messaging, intake lookup-state reset behavior and placeholder coverage, and AppointmentDetailModal import-boundary refactors that preserve behavior.