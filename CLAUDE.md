# CLAUDE Guidelines

## Scope

- Backend: `app/AutoService.ApiService`
- Frontend: `app/AutoService.WebUI`
- AppHost: `app/AutoService.AppHost`
- Shared defaults: `app/AutoService.ServiceDefaults`
- Tests: `tests`
- Automation scripts: `scripts`

## Model Selection (Auto)

- jev-router (the global `UserPromptSubmit` hook that injects the `[router]` line) owns the model and
  effort policy for every project; this repository keeps no model table of its own. Claude models are
  used only through the generic aliases `sonnet`, `opus` and `fable`, which always resolve to the newest
  release, and Haiku is never used.
- Follow the `[router]` line for the session. In the routed chain every step is routed again through
  `python ~/.jev-router/bin/route.py --json` (prompt on stdin), and the step's agent runs with the
  returned `model` and `effort`.

## Workflow (Ask First)

- At the start of every task, ask the user whether the agent workflow is needed for it, and wait
  for the answer before acting. Ask once per task, not on every follow-up prompt of the same task.
- Act on the answer:
    - workflow requested -> run the saved workflow `arsm-chain` (`.claude/workflows/arsm-chain.js`) with
      `args: {task, difficulty, area?, baseRef?}` (`difficulty` from the `[router]` line; `task` is the
      request plus every agreed constraint)
    - workflow declined -> do the work directly, without `orchestrator` and without the specialist agents
    - partial answer -> run exactly the steps the user named and nothing else
- `arsm-chain` encodes the routed chain deterministically:
    1. Plan: `orchestrator` decomposes the task, fixes any shared DTO/API contract up front, and returns
       open decisions as questions instead of choosing. Skipped when the router difficulty is 1 and the
       task touches a single area.
    2. Route: jev-router picks `model` and `effort` for every step.
    3. Implement: `backend` and `frontend` run in parallel on their disjoint trees; `migration` runs
       after `backend`, only on a real schema delta. `frontend` applies the `ui-ux-style-profile` policy
       itself while implementing.
    4. Review, in parallel and on the changed files only: `docs-sync` (documentation only),
       `coding-principles` (naming, SOLID/OOP, JSDoc) and, for UI changes, `ui-ux-style-profile` as a
       report-only audit.
    5. Gate: `python scripts/validate.py` once; failures and UI findings go back to the owning
       specialist for at most two fix rounds.
    6. Test: heavy suites only when their gate matches; E2E runs the specs selected for the diff by
       `python scripts/select-e2e-specs.py --run` (3 workers).
- Without the Workflow tool, run the same steps by hand in the same order and with the same parallelism.
- Whatever the answer, run `python scripts/validate.py` before committing a source change: it is
  deterministic, takes seconds, and costs no tokens.
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
- Security remediation runs in the `scripts/validate.py` security stage whenever a package manifest or
  lockfile changes (or with `--security`): `npm audit fix` then `npm audit --audit-level=high` for the
  WebUI, and `dotnet list package --vulnerable --include-transitive` for the backend, remediated safely.
- AI SQL tooling must use `ai_agent_test_user` with `SELECT`-only policy.
- Keep tracked MCP SQL templates (`.claude/.mcp.template.json`, `.vscode/mcp.template.json`, `.env.example`)
  placeholder-based; local gitignored `.claude/.mcp.json`, `.vscode/mcp.json`, and `.env` must hold the
  concrete read-only PostgreSQL URI for `ai_agent_test_user` on developer machines.

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
- `scripts/validate.py` enforces the file limits (and the C# type limit) on the changed files; `--all`
  checks the whole repository.

## Core Invariants

- WebUI clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).
- `People` remains abstract TPH; identity link via `People.IdentityUserId`.
- DTO-only API boundaries.
- Config-first runtime addressing; no localhost fallback hardcoding.
- Money columns (`Part`/`LaborType`/`Quote`/`QuoteLine`) are `numeric(18,2)`; gross is always computed
  by addition (`net + vat`), never by a separate gross-rate multiplication — enforced in
  `Pricing/QuoteLineCalculator` and `Pricing/QuoteTotalsCalculator`, and backed by the `CK_Quotes_Totals`
  database check constraint.

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
