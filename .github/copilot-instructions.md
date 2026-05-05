> Architecture Notice: ARSM uses GitHub Copilot + Claude Code. Keep `.github/**` and `.claude/**` policy-equivalent.

# ARSM Copilot Instructions

## Team Identity (Global)
- Elite startup; enterprise-grade delivery standards.
- Patrik (MIT, ex-Google): architecture + final quality authority.
- Mark (MIT, ex-BlackRock/Morgan Stanley): backend/data/scale authority.
- Gergely (Harvard, ex-Netflix/Meta): frontend/UI/UX authority.
- Zsombor (Stanford, ex-Amazon/Oracle): CI/CD, QA, security authority.

## Persona Routing
- Architecture/final approval -> Patrik.
- Backend/API/data -> Mark.
- Frontend/UI/UX -> Gergely.
- Testing/security/validation -> Zsombor.

## Repository Map
- `app/AutoService.ApiService` API/domain/EF.
- `app/AutoService.WebUI` React client.
- `app/AutoService.AppHost` Aspire orchestration.
- `app/AutoService.ServiceDefaults` shared service defaults.

## Mandatory Workflow
1. Orchestrator first (`Task Orchestrator`).
2. Specialists (`Backend Specialist`, `Frontend Specialist`, optional `EF Migration`).
3. `Build Validator` after code changes.
4. `Docs Sync` always; auto-remediate docs drift.
5. `Coding Principles` always; auto-remediate code-quality drift.
6. Security remediation on every code-change workflow:
   - WebUI touched: `npm audit fix`.
   - ApiService touched: `dotnet list package --vulnerable --include-transitive`, apply patch/minor updates, recheck.
7. Heavy test agents are conditional (gate below).

## Heavy Test Gate
Run `HTTP Endpoint Test`, `SQL Database Test`, `E2E Playwright Test` only when:
- explicitly requested by user, or
- significant feature/structural behavior change occurs.

When triggered by a new feature:
- auto-generate missing test coverage,
- then execute/update tests.

## Migration Isolation Gate
Run `EF Migration` only for actual schema/EF migration deltas.
No schema delta -> migration agent must skip.

## Engineering Principles (Mandatory)
- Enforce SOLID (SRP, OCP, LSP, ISP, DIP) in architecture and implementation.
- Apply OOP fundamentals: explicit responsibilities, low coupling, high cohesion.
- Use GoF 23 patterns intentionally where they reduce complexity and improve extensibility.
- Avoid pattern overuse without measurable benefit.
- Require engineering rationale for non-trivial decisions: why this design, why not alternatives, and impact on scalability/maintainability.

## Scalability & Maintainability Guardrails
- No god files/classes/methods.
- Source files:
  - preferred <= 350 lines,
  - hard limit: > 500 lines must be split.
- Test files:
  - preferred <= 180 lines,
  - hard limit: > 250 lines must be split.
- Class/service files:
  - preferred <= 220 lines,
  - hard limit: > 300 lines must be split by responsibility.
- Method/function target: <= 60 lines where practical.

## Core Rules
- Config-first endpoints/ports; no runtime localhost fallback in code.
- Preserve backend invariants: People abstract TPH, Identity link via `People.IdentityUserId`, DTO-only API boundaries.
- AI SQL safety: `ai_agent_test_user`, `SELECT` only, no DML/DDL.
- Keep `.github` and `.claude` agent+skill logic aligned.

## Scoped Instruction Files
- `.github/instructions/apiservice.instructions.md`
- `.github/instructions/webui.instructions.md`
- `.github/instructions/apphost.instructions.md`
- `.github/instructions/servicedefaults.instructions.md`
- `.github/instructions/tests.instructions.md`
