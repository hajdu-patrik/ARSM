#!/usr/bin/env node
/**
 * ARSM UserPromptSubmit hook.
 *
 * Re-injects the CLAUDE.md workflow contract on every user prompt so the ask-first rule and
 * the routing chain behind it cannot drift out of attention during a long session.
 * CLAUDE.md itself is only loaded once at session start; this keeps the contract present
 * on every turn instead.
 *
 * Emits the reminder through hookSpecificOutput.additionalContext, which the harness
 * injects into model context. Never blocks the prompt.
 */

const REMINDER = [
  'ARSM WORKFLOW CONTRACT (root CLAUDE.md). This governs every request in this repository.',
  '',
  'ASK FIRST. At the start of every task, ask the user whether the agent workflow is needed',
  'for it, and wait for the answer before acting. Ask once per task, not on every follow-up',
  'prompt of the same task. Then act on the answer:',
  '  - workflow requested -> run the saved workflow `arsm-chain` (.claude/workflows/arsm-chain.js)',
  '    with args {task, difficulty (from the [router] line), area?, baseRef?}',
  '  - workflow declined -> do the work directly, without `orchestrator` and without the',
  '    specialist agents',
  '  - partial answer -> run exactly the steps the user named and nothing else',
  '',
  'arsm-chain: Plan (`orchestrator` rates 0-4 and splits into work packages with disjoint owned',
  'paths; skipped for router difficulty 1 on a single area) -> Route (jev-router model + effort per',
  'package) -> Implement (packages in parallel, 2/2/4/6/8 at once for max(router, orchestrator)',
  'difficulty 0-4; dependencies and overlapping paths wait; `migration` after every backend package',
  'on a real schema delta; frontend applies the ui-ux-style-profile policy) -> Review per package as',
  'it finishes (`coding-principles`, `ui-ux-style-profile` report-only for UI; `docs-sync` beside',
  'the gate) -> Gate (`python scripts/validate.py`, failures to the owning package, max two fix',
  'rounds) -> Test (heavy suites only when their gate matches; E2E via',
  '`python scripts/select-e2e-specs.py --run`).',
  'Run `python scripts/validate.py` before committing any source change, workflow or not.',
  '',
  'These always apply, workflow or not:',
  '',
  'Decision ownership: the user owns all product, architecture, UX, policy, data-contract',
  'and behavior decisions. If a choice is not unambiguous from the prompt, repo instructions,',
  'existing code conventions, or the active plan, ASK instead of deciding.',
  '',
  'Model selection: jev-router owns the policy (the [router] line; per step',
  '`python ~/.jev-router/bin/route.py --json`). Aliases sonnet/opus/fable only, never Haiku.',
  '',
  'Version control: the repository owner is the only commit author. Never add Co-Authored-By,',
  'Claude-Session, or any "generated with" attribution to a commit, PR, or merge message.',
].join('\n');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: REMINDER,
  },
  suppressOutput: true,
}));
