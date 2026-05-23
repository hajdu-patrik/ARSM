# ARSM Copilot Instructions

> Keep `.github/**` and `.claude/**` policy-equivalent.

## Scope

- Backend: `app/AutoService.ApiService`
- Frontend: `app/AutoService.WebUI`
- AppHost: `app/AutoService.AppHost`
- Shared defaults: `app/AutoService.ServiceDefaults`
- Tests: `tests`
- Automation scripts: `scripts`

## Model Selection (Auto)

- Do not auto-select models that cost more than 3x baseline.
- Forbidden for automatic selection: `claude-opus-4.7` and `gpt-5.5`.
- Preferred pool: `gpt-5.3-codex`, `gpt-5.4`, `claude-sonnet 4.6`, or equivalent tier.
- If top-tier is genuinely needed, ask user approval first.

## Mandatory Workflow

1. Start with `Task Orchestrator`.
2. Route implementation:
   - backend/platform changes -> `Backend Specialist`
   - frontend changes -> `Frontend Specialist` + `ui-ux-style-profile` (mandatory pair)
   - schema-only delta -> optional `EF Migration`
3. Run `Build Validator`.
4. Run `Docs Sync`.
5. Run `Coding Principles` for source changes.
6. Run security remediation for code changes.
7. Run heavy test agents only when gate conditions match.

## Gates

- Heavy tests run only on explicit request or significant behavior changes:
  - `http-endpoint-test`: API contract/auth/validation behavior
  - `sql-database-test`: schema/persistence/integrity behavior
  - `e2e-playwright-test`: frontend structural/user-flow behavior
- `EF Migration` runs only for real schema/EF delta.

## Security and Secrets

- Never hardcode credentials, tokens, connection strings, or runtime hosts.
- Frontend code-change workflows: run `npm audit fix`.
- Backend code-change workflows: run `dotnet list package --vulnerable --include-transitive` and remediate safely.
- AI SQL tooling must use `ai_agent_test_user` with `SELECT`-only policy.
- Keep MCP SQL profile aligned in `.claude/.mcp.json` and `.vscode/mcp.json`.

## Canonical Local Test Runner

- Use `python scripts/run-local-test-suite.py [all|playwright|http|sql]`.
- Runner loads local secrets (`.secrets`, `tests/.env`) and writes sanitized summary to `tests/.artifacts/test-suite-summary.json`.
- Never publish raw `.env`, `.secrets`, tokens, cookies, or unsanitized logs.

## Engineering Guardrails

- Enforce SOLID/OOP boundaries.
- Use GoF patterns only where they reduce complexity and improve extensibility.
- Provide rationale for non-trivial design decisions.
- Size limits:
  - source file > 500 lines: split
  - test file > 250 lines: split
  - class/service > 300 lines: split
  - method/function target <= 60 lines where practical

## Core Invariants

- WebUI clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).
- `People` remains abstract TPH; identity link via `People.IdentityUserId`.
- DTO-only API boundaries.
- Config-first runtime addressing; no localhost fallback hardcoding.

## Scoped Instruction Files

- `.github/instructions/apiservice.instructions.md`
- `.github/instructions/webui.instructions.md`
- `.github/instructions/apphost.instructions.md`
- `.github/instructions/servicedefaults.instructions.md`
- `.github/instructions/tests.instructions.md`
- `.github/instructions/scripts.instructions.md`
