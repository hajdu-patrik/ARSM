#!/usr/bin/env node
/** ARSM UserPromptSubmit hook: re-injects the CLAUDE.md workflow contract every turn (it loads once
 * at session start) via hookSpecificOutput.additionalContext; never blocks the prompt. */

const REMINDER = [
  'ARSM WORKFLOW CONTRACT (root CLAUDE.md). This governs every request in this repository.',
  '',
  'ASK FIRST. At the start of every task, ask the user whether the agent workflow is needed',
  'for it, and wait for the answer before acting. Ask once per task, not on every follow-up',
  'prompt of the same task. Then act on the answer:',
  '  - workflow requested -> run the saved workflow `arsm-chain` (.claude/workflows/arsm-chain.js)',
  '    with args {task, difficulty (difficulty=), route {model, effort} (model=, effort=; all from the',
  '    [router] header line), area?, baseRef?}',
  '  - workflow declined -> do the work directly, without `orchestrator` and without the',
  '    specialist agents',
  '  - partial answer -> run exactly the steps the user named and nothing else',
  '',
  'arsm-chain: Plan (`orchestrator` rates 0-4 and splits into work packages with disjoint owned',
  'paths and routes every package and step through the trirouter; skipped for router difficulty 1 on',
  'a single area) -> Implement (packages in parallel on their routed model, 2/2/4/6/8 at once for max(router, orchestrator)',
  'difficulty 0-4; dependencies and overlapping paths wait; `migration` after every backend package',
  'on a real schema delta; frontend applies the ui-ux-style-profile policy) -> Review per package as',
  'it finishes (`coding-principles`, `ui-ux-style-profile` report-only for UI; `docs-sync` beside',
  'the gate) -> Gate (`python scripts/validate.py`, failures to the owning package, max two fix',
  'rounds) -> Test (a regression test for every self-found defect, then heavy suites only when',
  'their gate matches; E2E via `python scripts/select-e2e-specs.py --run`).',
  'A behaviour defect found during a run is done only when a test proves the fix, workflow or not.',
  'Run `python scripts/validate.py` before committing any source change, workflow or not.',
  '',
  'These always apply, workflow or not:',
  '',
  'Decision ownership: the user owns all product, architecture, UX, policy, data-contract',
  'and behavior decisions. If a choice is not unambiguous from the prompt, repo instructions,',
  'existing code conventions, or the active plan, ASK instead of deciding.',
  '',
  'Model selection: the main session follows the [router] line, whatever model it names (haiku,',
  'sonnet, opus or fable; none is banned). Inside arsm-chain the model and effort of every step come from',
  'the trirouter too: the orchestrator routes each package and step, the workflow passes the choice',
  'to the agents, and a documented per-field fallback applies only if a router result is missing.',
  '',
  'Comments: at most 2 lines each, doc comments included. Temporary files only in the scratchpad or',
  'OS temp, never in the repository and never committed; arsm-chain cleans up beside docs-sync.',
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
