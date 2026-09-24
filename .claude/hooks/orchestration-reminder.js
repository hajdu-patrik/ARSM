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
 *
 * The model-selection line is read from the generated model-policy table in the root CLAUDE.md
 * (refreshed daily by scripts/update-model-policy.py), so the reminder never drifts from it.
 */

const fs = require('fs');
const path = require('path');

const FALLBACK_MODEL_LINE = 'Model selection: follow the model-policy table in the root CLAUDE.md.';

/**
 * Builds the model-selection reminder from the CLAUDE.md model-policy table.
 * @returns {string} One paragraph naming each family's latest model, effort, use and approval.
 */
function readModelSelectionLine() {
  try {
    const claudeMd = fs.readFileSync(path.join(process.env.CLAUDE_PROJECT_DIR || '.', 'CLAUDE.md'), 'utf8');
    const block = claudeMd.split('<!-- model-policy:start -->')[1]?.split('<!-- model-policy:end -->')[0] ?? '';
    const rows = block.split(/\r?\n/)
      .filter((line) => line.startsWith('| ') && !line.startsWith('| Family'))
      .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim().replace(/`/g, '')));
    if (rows.length === 0) {
      return FALLBACK_MODEL_LINE;
    }
    const tiers = rows.map(([family, model, effort, useFor, approval]) =>
      `${family} ${model} at ${effort} for ${useFor}${approval === 'not needed' ? '' : ` (${approval})`}`);
    return `Model selection (root CLAUDE.md table): ${tiers.join('; ')}. Never Haiku, never an older version of a family.`;
  } catch {
    return FALLBACK_MODEL_LINE;
  }
}

const REMINDER = [
  'ARSM WORKFLOW CONTRACT (root CLAUDE.md). This governs every request in this repository.',
  '',
  'ASK FIRST. At the start of every task, ask the user whether the agent workflow is needed',
  'for it, and wait for the answer before acting. Ask once per task, not on every follow-up',
  'prompt of the same task. Then act on the answer:',
  '  - workflow requested -> run the routed chain below',
  '  - workflow declined -> do the work directly, without `orchestrator` and without the',
  '    specialist agents',
  '  - partial answer -> run exactly the steps the user named and nothing else',
  '',
  'Routed chain, only when the user asks for it:',
  '1. Start with the `orchestrator` agent. It is plan-only and owns decomposition and routing.',
  '2. Route implementation from the orchestrator plan:',
  '   - backend/platform changes (ApiService, AppHost, ServiceDefaults) -> `backend`',
  '   - frontend/UI changes, including responsiveness, interaction, or style-policy work',
  '     -> `frontend` + `ui-ux-style-profile` as a MANDATORY PAIR, never one alone',
  '   - schema-only EF delta -> `migration` (only on a real schema delta)',
  '3. Run `validate` (build, type-check, security gate).',
  '4. Run `docs-sync` (Claude instruction layer and README drift).',
  '5. Run `coding-principles` for any source change.',
  '6. Run security remediation for code changes:',
  '   - frontend: `npm audit fix`',
  '   - backend: `dotnet list package --vulnerable --include-transitive`',
  '7. Heavy test agents only when their gate matches (`http-endpoint-test`,',
  '   `sql-database-test`, `e2e-playwright-test`) or on explicit request.',
  '',
  'These always apply, workflow or not:',
  '',
  'Decision ownership: the user owns all product, architecture, UX, policy, data-contract',
  'and behavior decisions. If a choice is not unambiguous from the prompt, repo instructions,',
  'existing code conventions, or the active plan, ASK instead of deciding.',
  '',
  readModelSelectionLine(),
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
