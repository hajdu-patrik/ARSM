# CLAUDE Guidelines

> Keep `.claude/**` and `.github/**` policy-equivalent.

## Scope

- Backend: `app/AutoService.ApiService`
- Frontend: `app/AutoService.WebUI`
- AppHost: `app/AutoService.AppHost`
- Shared defaults: `app/AutoService.ServiceDefaults`
- Tests: `tests`
- Automation scripts: `scripts`

## Model Selection (Auto)

- Do not auto-select models that cost more than 3x baseline.
- Forbidden for automatic selection: `claude-opus-4.7`.
- Preferred pool: `claude-sonnet 4.6`, `claude-haiku` (or equivalent).
- If top-tier is truly needed, ask user approval first.

## Mandatory Workflow

1. Start with `orchestrator`.
2. Route implementation:
    - backend/platform changes -> `backend`
    - frontend/UI changes, including responsiveness, interaction, or style-policy changes -> `frontend` + `ui-ux-style-profile` (mandatory pair)
    - schema-only delta -> optional `migration`
3. Run `validate`.
4. Run `docs-sync`.
5. Run `coding-principles` for source changes.
6. Run security remediation for code changes.
7. Run heavy test agents only when gate conditions match.

## Decision Ownership

- The user owns all product, architecture, UX, policy, data-contract, and behavior decisions.
- Do not invent or add features, styles, abstractions, workflows, tests, documentation policy, UI copy, data fields, defaults, or behavior that are not explicitly requested, already specified in instructions, or agreed in the active plan.
- If a decision is not unambiguous from the prompt, repository instructions, existing code conventions, or active implementation plan, ask the user instead of choosing on their behalf.
- Routine mechanical implementation details are allowed only when they directly follow the existing codebase pattern and do not change behavior or scope.

## Gates

- Heavy tests run only on explicit request or significant behavior changes:
  - `http-endpoint-test`: API contract/auth/validation behavior
  - `sql-database-test`: schema/persistence/integrity behavior
  - `e2e-playwright-test`: frontend structural/user-flow behavior
- `migration` runs only for real schema/EF delta.

## Security and Secrets

- Never hardcode credentials, tokens, connection strings, or runtime hosts.
- Frontend code-change workflows: run `npm audit fix`.
- Backend code-change workflows: run `dotnet list package --vulnerable --include-transitive` and remediate safely.
- AI SQL tooling must use `ai_agent_test_user` with `SELECT`-only policy.
- Keep MCP SQL templates on `${env:ARSM_MCP_POSTGRES_CONNECTION_STRING}`; local gitignored `.claude/.mcp.json` and `.vscode/mcp.json` may hold the concrete read-only PostgreSQL URI for `ai_agent_test_user`.

## Canonical Local Test Runner

- Use `python scripts/run-local-test-suite.py [all|playwright|http|sql]`.
- Runner loads local secrets (`.secrets`, `tests/.env`) and writes sanitized summary to `tests/.artifacts/test-suite-summary.json`.
- Runner child commands default to a 300-second timeout; use `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` only for slower local runs.
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

## Area Rule Files

- Backend: `app/AutoService.ApiService/CLAUDE.md`
- Frontend: `app/AutoService.WebUI/CLAUDE.md`
- AppHost: `app/AutoService.AppHost/CLAUDE.md`
- ServiceDefaults: `app/AutoService.ServiceDefaults/CLAUDE.md`
- Tests: `tests/CLAUDE.md`
- Scripts: `scripts/CLAUDE.md`

## UI/UX Policy Synchronization

- Keep UI/UX policy pairs semantically equivalent across Claude and GitHub surfaces:
  - `.claude/agents/ui-ux-style-profile.md` <-> `.github/agents/ui-ux-style-profile.agent.md`
  - `.claude/agents/frontend.md` <-> `.github/agents/frontend.agent.md`
  - `.claude/skills/ui-ux-sync/SKILL.md` <-> `.github/skills/ui-ux-sync/SKILL.md`
  - `app/AutoService.WebUI/CLAUDE.md` <-> `.github/instructions/webui.instructions.md`
- Style-architecture work is visual-preserving by default; do not change rendered UI without an explicit redesign request.
