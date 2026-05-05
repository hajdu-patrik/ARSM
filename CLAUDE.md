# CLAUDE Guidelines

> Architecture Notice: ARSM uses Claude Code + GitHub Copilot. Keep `.claude/**` and `.github/**` policy-equivalent.

## Team Identity (Global)
- Elite startup: MIT/Harvard/Stanford founding team; enterprise-scale quality bar.
- Patrik (CEO, Chief Architect, MIT, ex-Google): architecture authority, final quality gate.
- Mark (Backend Lead, MIT, ex-BlackRock/Morgan Stanley): backend/data/scale authority.
- Gergely (Frontend Lead, Harvard, ex-Netflix/Meta): UI/UX/responsive authority.
- Zsombor (DevAIMLSecOps+QA, Stanford, ex-Amazon/Oracle): CI/CD, testing, security authority.

## Persona Routing
- Architecture/final approval: Patrik.
- Backend/API/data: Mark.
- Frontend/UI/UX: Gergely.
- Testing/security/validation: Zsombor.

## Stack
- Backend: .NET 10, ASP.NET Core API, EF Core, PostgreSQL.
- Frontend: React 19, TypeScript, Vite, Tailwind.
- Orchestration: .NET Aspire.

## Mandatory Agent Workflow
1. Orchestrator first (`orchestrator`).
2. Specialist implementation (`backend`, `frontend`, optional `migration`).
3. Validate (`validate`) after code changes.
4. Docs sync always (`docs-sync`) with automatic documentation remediation.
5. Coding principles always (`coding-principles`) with automatic source remediation.
6. Security remediation on every code-change workflow:
   - Frontend touched: `npm audit fix`.
   - Backend touched: `dotnet list package --vulnerable --include-transitive` then patch/minor upgrades and recheck.
7. Heavy test agents (`http-endpoint-test`, `sql-database-test`, `e2e-playwright-test`) are conditional (see gate).

## Heavy Test Gate (Cost Control)
Run heavy test agents only when:
- user explicitly requests tests, or
- change is significant: new feature, API contract change, schema/persistence change, or UI/DTO-visible structural flow change.

If heavy test agent is triggered by a new feature:
- generate missing coverage first,
- then execute/update the suite.

## Migration Gate (Isolation)
Run `migration` only if schema delta exists:
- entity model/DbContext relationship/column/index constraints changed, or
- EF migration files changed/required.
Otherwise: skip migration agent.

## Engineering Principles (Mandatory)
- Apply SOLID principles systematically (SRP, OCP, LSP, ISP, DIP).
- Use OOP intentionally: cohesive classes, explicit responsibilities, low coupling, high cohesion.
- Use GoF 23 patterns pragmatically (for example Strategy, Factory, Adapter, Observer) where they reduce complexity and improve extensibility.
- Do not force patterns without clear value; avoid pattern cargo-culting.
- For non-trivial design decisions, include engineering rationale: why this approach, why alternatives were rejected, and how scalability/maintainability is improved.

## Scalability & Maintainability Guardrails
- No god files, no god classes, no god methods.
- Source file targets:
  - preferred <= 350 lines,
  - hard limit: > 500 lines must be split.
- Test file targets:
  - preferred <= 180 lines,
  - hard limit: > 250 lines must be split.
- Class/service targets:
  - preferred <= 220 lines,
  - hard limit: > 300 lines must be split by responsibility.
- Method/function target: <= 60 lines where practical; split long methods into focused helpers.

## Non-Negotiables
- Configuration-first addressing: no hardcoded runtime fallback URLs/ports.
- Backend invariants: `People` remains abstract TPH; Identity linkage via `People.IdentityUserId`; expertise and relationship invariants preserved.
- API boundaries use DTOs only; no direct EF entity exposure.
- SQL safety for AI tooling: `ai_agent_test_user`, read-only `SELECT`, no DML/DDL.

## Platform Alignment Rule
- Claude + Copilot agents/skills must be semantically equivalent.
- Differences allowed only for platform syntax/frontmatter/tool declarations.

## Area-Specific Rule Files
- Backend: `app/AutoService.ApiService/CLAUDE.md`
- Frontend: `app/AutoService.WebUI/CLAUDE.md`
- AppHost: `app/AutoService.AppHost/CLAUDE.md`
- ServiceDefaults: `app/AutoService.ServiceDefaults/CLAUDE.md`
- Tests: `tests/CLAUDE.md`
