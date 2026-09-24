export const meta = {
  name: 'arsm-chain',
  description: 'ARSM routed chain: plan, jev-router model per step, parallel implement, diff review, validate.py gate, targeted tests',
  whenToUse: 'The user asked for the agent workflow on an ARSM task. Pass args {task, difficulty?, area?, baseRef?}.',
  phases: [
    { title: 'Plan', detail: 'orchestrator decomposes the task (skipped for difficulty-1 single-area tasks)' },
    { title: 'Route', detail: 'jev-router picks model and effort for every step' },
    { title: 'Implement', detail: 'backend and frontend in parallel, migration after backend' },
    { title: 'Review', detail: 'docs-sync, coding-principles, ui-ux-style-profile on the diff only' },
    { title: 'Gate', detail: 'scripts/validate.py, one fix round per failure, max two rounds' },
    { title: 'Test', detail: 'heavy suites only when their gate matches; E2E targeted to the diff' },
  ],
}

// ---------------------------------------------------------------- inputs
const task = typeof args === 'string' ? args : (args && args.task) || ''
const difficulty = args && typeof args.difficulty === 'number' ? args.difficulty : null
const directArea = args && args.area ? args.area : null
const baseRef = (args && args.baseRef) || 'HEAD'
if (!task) throw new Error('arsm-chain needs args.task (the user request plus every agreed constraint).')

const AREAS = ['backend', 'frontend', 'migration']
const MODELS = ['sonnet', 'opus', 'fable']
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
// Reviewers and mechanical runners: cheap and fast (never Haiku - jev-router policy).
const CHEAP = { model: 'sonnet', effort: 'low' }

const STR_LIST = { type: 'array', items: { type: 'string' } }
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    contract: { type: 'string', description: 'Shared DTO/API contract fixed up front so backend and frontend can run in parallel; empty if none.' },
    steps: { type: 'array', items: { type: 'object', properties: { area: { type: 'string', enum: AREAS }, prompt: { type: 'string' } }, required: ['area', 'prompt'] } },
    uiChange: { type: 'boolean' },
    gates: { type: 'object', properties: { e2e: { type: 'boolean' }, http: { type: 'boolean' }, sql: { type: 'boolean' } }, required: ['e2e', 'http', 'sql'] },
    questions: { ...STR_LIST, description: 'Undecided product/UX/contract questions the user must answer before implementation.' },
  },
  required: ['contract', 'steps', 'uiChange', 'gates', 'questions'],
}
const ROUTES_SCHEMA = {
  type: 'object',
  properties: { routes: { type: 'array', items: { type: 'object', properties: { model: { type: ['string', 'null'] }, effort: { type: ['string', 'null'] } }, required: ['model', 'effort'] } } },
  required: ['routes'],
}
const IMPL_SCHEMA = {
  type: 'object',
  properties: { summary: { type: 'string' }, filesChanged: STR_LIST, openQuestions: STR_LIST },
  required: ['summary', 'filesChanged', 'openQuestions'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: { summary: { type: 'string' }, filesChanged: STR_LIST, findings: STR_LIST },
  required: ['summary', 'filesChanged', 'findings'],
}
const GATE_SCHEMA = {
  type: 'object',
  properties: { passed: { type: 'boolean' }, failures: { type: 'array', items: { type: 'object', properties: { stage: { type: 'string' }, detail: STR_LIST }, required: ['stage', 'detail'] } } },
  required: ['passed', 'failures'],
}

// ---------------------------------------------------------------- plan
phase('Plan')
let plan
if (difficulty === 1 && AREAS.includes(directArea)) {
  log(`Router difficulty 1, single area ${directArea}: orchestrator skipped.`)
  plan = { contract: '', steps: [{ area: directArea, prompt: task }], uiChange: directArea === 'frontend', gates: { e2e: false, http: false, sql: false }, questions: [] }
} else {
  plan = await agent(
    `Plan this ARSM task. Split it into at most one step per area (backend, frontend, migration only on a real schema delta). ` +
    `If backend and frontend both change, fix the shared DTO/API contract in \`contract\` so they can be implemented in parallel. ` +
    `Set gates per the root CLAUDE.md Gates section. List every undecided product/UX/contract decision in \`questions\` instead of choosing.\n\nTask:\n${task}`,
    { agentType: 'orchestrator', phase: 'Plan', schema: PLAN_SCHEMA })
}
if (!plan) throw new Error('The orchestrator returned no plan.')
if (plan.questions.length) return { status: 'needs-user', questions: plan.questions, plan }

// ---------------------------------------------------------------- route
phase('Route')
const routed = await agent(
  `For each step prompt below, run \`python ~/.jev-router/bin/route.py --json\` with the prompt on stdin ` +
  `(for example with a heredoc) and return its \`model\` and \`effort\` fields in the same order. ` +
  `If the shim is missing or fails, return null for both. Do nothing else.\n\n` +
  plan.steps.map((s, i) => `--- step ${i + 1} (${s.area})\n${s.prompt}`).join('\n'),
  { ...CHEAP, phase: 'Route', schema: ROUTES_SCHEMA })
const routeFor = (i) => {
  const r = (routed && routed.routes[i]) || {}
  return {
    ...(MODELS.includes(r.model) ? { model: r.model } : {}),
    ...(EFFORTS.includes(r.effort) ? { effort: r.effort } : {}),
  }
}

// ---------------------------------------------------------------- implement
phase('Implement')
const stepPrompt = (s) =>
  `${s.prompt}\n\n` +
  (plan.contract ? `Shared contract (fixed, do not change it):\n${plan.contract}\n\n` : '') +
  (s.area === 'frontend' ? 'Apply the UI/UX policy in `.claude/agents/ui-ux-style-profile.md` yourself while implementing; it is reviewed on the diff afterwards.\n\n' : '') +
  `Original task for context:\n${task}\n\nDo not run validation or tests; the chain does that. Report every file you changed.`
const runStep = (s, i) => agent(stepPrompt(s), { agentType: s.area, phase: 'Implement', label: `implement:${s.area}`, ...routeFor(i), schema: IMPL_SCHEMA })

const indexed = plan.steps.map((s, i) => ({ s, i }))
const backendChain = async () => {
  const out = []
  for (const { s, i } of indexed.filter((x) => x.s.area !== 'frontend')) out.push(await runStep(s, i)) // migration after backend
  return out
}
const frontendChain = async () => Promise.all(indexed.filter((x) => x.s.area === 'frontend').map(({ s, i }) => runStep(s, i)))
const implemented = (await parallel([backendChain, frontendChain])).flat().filter(Boolean)
const openQuestions = implemented.flatMap((r) => r.openQuestions)
if (openQuestions.length) return { status: 'needs-user', questions: openQuestions, plan, implemented }
let changed = [...new Set(implemented.flatMap((r) => r.filesChanged))]

// ---------------------------------------------------------------- review
phase('Review')
const source = changed.filter((f) => /\.(cs|ts|tsx)$/.test(f))
const ui = changed.filter((f) => f.startsWith('app/AutoService.WebUI/'))
const reviewPrompt = (what, files) =>
  `${what}\nReview ONLY these changed files (diff against ${baseRef}); do not sweep the repository:\n${files.join('\n')}`
const reviews = await parallel([
  () => agent(reviewPrompt('Sync the Claude instruction layer and READMEs with these changes; edit documentation files only.', changed),
    { agentType: 'docs-sync', phase: 'Review', ...CHEAP, schema: REVIEW_SCHEMA }),
  () => source.length ? agent(reviewPrompt('Apply naming, SOLID/OOP and JSDoc rules; size limits are checked by scripts/validate.py, not by you.', source),
    { agentType: 'coding-principles', phase: 'Review', ...CHEAP, schema: REVIEW_SCHEMA }) : null,
  () => plan.uiChange && ui.length ? agent(reviewPrompt('Audit against the UI/UX policy. REPORT ONLY: list findings, do not edit (a fix round follows).', ui),
    { agentType: 'ui-ux-style-profile', phase: 'Review', model: 'sonnet', effort: 'medium', schema: REVIEW_SCHEMA }) : null,
])
const review = reviews.filter(Boolean)
changed = [...new Set([...changed, ...review.flatMap((r) => r.filesChanged)])]
let pendingFixes = (reviews[2] && reviews[2].findings.length) ? [{ stage: 'ui-ux', detail: reviews[2].findings }] : []

// ---------------------------------------------------------------- gate
phase('Gate')
const runGate = () => agent(
  `Run \`python scripts/validate.py --base ${baseRef} --json\` from the repository root and return \`passed\` and the failing stages ` +
  `with their detail lines, verbatim. Change nothing.`,
  { ...CHEAP, phase: 'Gate', schema: GATE_SCHEMA })
let gate = await runGate()
for (let round = 1; round <= 2 && ((gate && !gate.passed) || pendingFixes.length); round++) {
  const failures = [...pendingFixes, ...((gate && gate.failures) || [])]
  pendingFixes = []
  const owners = [...new Set(failures.map((f) => (f.stage === 'frontend' || f.stage === 'shadows' || f.stage === 'ui-ux') ? 'frontend' : 'backend'))]
  log(`Fix round ${round}: ${failures.map((f) => f.stage).join(', ')}`)
  await parallel(owners.map((owner) => () => agent(
    `Fix these validation/review failures in your scope, nothing else:\n${JSON.stringify(failures, null, 2)}\n\nChanged files so far:\n${changed.join('\n')}`,
    { agentType: owner, phase: 'Gate', label: `fix:${owner}:${round}`, ...routeFor(plan.steps.findIndex((s) => s.area === owner)), schema: IMPL_SCHEMA })))
  gate = await runGate()
}
if (!gate || !gate.passed) return { status: 'gate-failed', gate, plan, implemented, review }

// ---------------------------------------------------------------- test
phase('Test')
const tests = []
if (plan.gates.e2e) tests.push(await agent(
  `Generate missing coverage first if this is a new feature, then run \`python scripts/select-e2e-specs.py --base ${baseRef} --run\` ` +
  `(targeted specs, 3 workers) and report the sanitized summary.\nChanged files:\n${changed.join('\n')}`,
  { agentType: 'e2e-playwright-test', phase: 'Test', model: 'sonnet', effort: 'medium' }))
// HTTP and SQL share the runner's summary file, so they run one after another.
if (plan.gates.http) tests.push(await agent(`Run the HTTP endpoint gate for these changes:\n${changed.join('\n')}`,
  { agentType: 'http-endpoint-test', phase: 'Test', model: 'sonnet', effort: 'medium' }))
if (plan.gates.sql) tests.push(await agent(`Run the SQL gate for these changes:\n${changed.join('\n')}`,
  { agentType: 'sql-database-test', phase: 'Test', model: 'sonnet', effort: 'medium' }))

return { status: 'done', plan, routes: routed && routed.routes, implemented, review, gate, tests, changed }
