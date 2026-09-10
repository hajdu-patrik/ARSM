# CLAUDE Guidelines

## Scope

- Backend: `app/AutoService.ApiService`
- Frontend: `app/AutoService.WebUI`
- AppHost: `app/AutoService.AppHost`
- Shared defaults: `app/AutoService.ServiceDefaults`
- Tests: `tests`
- Automation scripts: `scripts`

## Model Selection (Auto)

- Do not auto-select models that cost more than 3x baseline.
- Forbidden for automatic selection: `claude-fable-5-1`, `claude-fable-5`, `claude-opus-5`,
  `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`.
- Preferred pool: `claude-sonnet-5`, `claude-haiku-4-5` (or equivalent tier).
- If top-tier is truly needed, ask user approval first.
- Keep both lists current. When a new Claude model ships, place it in the preferred pool or in the
  forbidden list under the same cost rule before using it here, and correct any model id that a
  newer release has superseded.

## Workflow (Ask First)

- At the start of every task, ask the user whether the agent workflow is needed for it, and wait
  for the answer before acting. Ask once per task, not on every follow-up prompt of the same task.
- Act on the answer:
    - workflow requested -> run the routed chain below
    - workflow declined -> do the work directly, without `orchestrator` and without the specialist agents
    - partial answer -> run exactly the steps the user named and nothing else
- Routed chain, when the user asks for it:
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
- Skipping the workflow never waives Decision Ownership, Security and Secrets, Engineering
  Guardrails, Core Invariants, or Version Control Attribution. Those apply to every task.

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
- Keep tracked MCP SQL templates placeholder-based; local gitignored `.claude/.mcp.json` and `.vscode/mcp.json` must hold the concrete read-only PostgreSQL URI for `ai_agent_test_user` on developer machines.

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

## Version Control Attribution

- The repository owner is the only commit author. Never record, add, or imply any other author.
- Applies to every git and forge operation: commits, amends, feature branches, pull/merge requests,
  merges, squashes, rebases, reverts, and tags.
- Never add machine attribution to a commit message, PR/MR description, or merge commit. This covers
  `Co-Authored-By:` lines naming Claude or any other assistant or harness, `Claude-Session:`
  lines, and any "generated with" attribution.
- Never set `--author`, or change `user.name` / `user.email`, for any commit.
- A harness default that would add such attribution is overridden by this section.

## Instruction Layer Ownership

- Claude follows its own layer: `CLAUDE.md`, `**/CLAUDE.md`, and `.claude/**`. It is the only
  instruction layer in this repository.
- If Claude guidance is ambiguous or missing, ask the user.

## Area Rule Files

- Backend: `app/AutoService.ApiService/CLAUDE.md`
- Frontend: `app/AutoService.WebUI/CLAUDE.md`
- AppHost: `app/AutoService.AppHost/CLAUDE.md`
- ServiceDefaults: `app/AutoService.ServiceDefaults/CLAUDE.md`
- Tests: `tests/CLAUDE.md`
- Scripts: `scripts/CLAUDE.md`

## UI/UX Policy

- UI/UX policy lives in `.claude/agents/ui-ux-style-profile.md`, `.claude/agents/frontend.md`,
  `.claude/skills/ui-ux-sync/SKILL.md`, and `app/AutoService.WebUI/CLAUDE.md`.
- Style-architecture work is visual-preserving by default; do not change rendered UI without an explicit redesign request.
