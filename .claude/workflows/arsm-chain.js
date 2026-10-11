export const meta = {
  name: 'arsm-chain',
  description: 'ARSM chain: orchestrator plan, parallel work packages, per-package review, validate.py gate and targeted tests; every step runs on the model and effort the trirouter picks',
  whenToUse: 'The user asked for the agent workflow on an ARSM task. Pass args {task, difficulty?, area?, baseRef?, route?}.',
  phases: [
    { title: 'Plan', detail: 'orchestrator splits the task into work packages with disjoint file ownership (skipped for difficulty-1 single-area tasks)' },
    { title: 'Implement', detail: 'packages run in parallel on their routed model and effort, capped by the max(router, orchestrator) difficulty' },
    { title: 'Review', detail: 'each package is reviewed as soon as it finishes; docs-sync and the cleanup run beside the gate' },
    { title: 'Gate', detail: 'scripts/validate.py, failures go back to the owning package, max two rounds' },
    { title: 'Test', detail: 'heavy suites only when their gate matches; E2E targeted to the diff' },
  ],
}

// inputs
const task = typeof args === 'string' ? args : args?.task || ''
const routerDifficulty = typeof args?.difficulty === 'number' ? args.difficulty : null
const directArea = args?.area || null
const baseRef = args?.baseRef || 'HEAD'
const taskRoute = args?.route || null // {model, effort} from the [router] line's model=/effort= fields: the planner's route
if (!task) throw new Error('arsm-chain needs args.task (the user request plus every agreed constraint).')

const AREAS = ['backend', 'frontend', 'migration']
const AREA_ROOTS = {
  frontend: ['app/AutoService.WebUI'],
  backend: ['app/AutoService.ApiService', 'app/AutoService.AppHost', 'app/AutoService.ServiceDefaults'],
  migration: ['app/AutoService.ApiService/Data/Migrations'],
}
const WEBUI_PREFIX = 'app/AutoService.WebUI/'
// Implementing agents that may run at once, indexed by the effective 0-4 difficulty.
const PARALLEL_CAP = [2, 2, 4, 6, 8]
// Models come from the trirouter (user decision 2026-10-11): the orchestrator routes every package and step, the
// plan carries {model, effort}, and a field missing or invalid there falls back to FALLBACK (the 2026-09-27 policy).
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const FALLBACK = {
  plan: { model: 'opus', effort: 'high' },
  implement: { model: 'sonnet', effort: 'max' },
  fix: { model: 'sonnet', effort: 'max' },
  review: { model: 'opus', effort: 'high' },
  gate: { model: 'sonnet', effort: 'low' },
  test: { model: 'sonnet', effort: 'medium' },
}
// The only model values accepted from the router; anything else (an ID, another tool's model, a new family) falls back.
const SUPPORTED_MODELS = ['haiku', 'sonnet', 'opus', 'fable']
const isModel = (m) => typeof m === 'string' && SUPPORTED_MODELS.includes(m.trim().toLowerCase())
/** The routed {model, effort} of `role`; each field the router did not supply validly comes from FALLBACK. */
const resolveRoute = (route, role) => {
  const fb = FALLBACK[role]
  const model = isModel(route?.model) ? route.model.trim().toLowerCase() : null
  const effort = EFFORTS.includes(route?.effort) ? route.effort : null
  return { model: model ?? fb.model, effort: effort ?? fb.effort, source: model && effort ? 'router' : model || effort ? 'partial' : 'fallback' }
}
// Error text that says the model or effort was refused before any work started (agent() documents no error class).
const START_REJECTED = /issue with the selected model|may not exist|unknown model|invalid model|model_not_found|no such model|unsupported (model|effort)|(model|effort)[^.]{0,60}(not (supported|available|found|recognized|accepted)|invalid|unknown|unsupported)/i
const routeKey = (r) => `${r.model}/${r.effort}`
const rejectedRoutes = new Set() // routes proven to be refused at start, this run only
const ran = [] // one entry per agent call: planned vs used route and why it fell back
/** Runs an agent on its route; only a proven start rejection retries on FALLBACK[role], every other error propagates. */
const run = async (role, route, prompt, opts) => {
  const fb = FALLBACK[role]
  const entry = { label: opts.label || role, role, source: route.source, planned: routeKey(route), used: routeKey(route) }
  ran.push(entry)
  const on = (r) => agent(prompt, { ...opts, model: r.model, effort: r.effort })
  const fallBack = (reason) => { entry.used = routeKey(fb); entry.fallbackReason = reason; return on(fb) }
  if (routeKey(route) === routeKey(fb)) return on(route)
  if (rejectedRoutes.has(routeKey(route))) return fallBack('route refused earlier in this run')
  try {
    return await on(route)
  } catch (error) {
    const text = String(error?.message || error)
    if (!START_REJECTED.test(text)) throw error
    rejectedRoutes.add(routeKey(route))
    log(`${entry.label}: ${entry.planned} refused at start (${text.slice(0, 80)}); falling back to ${routeKey(fb)}.`)
    return fallBack(`start refused: ${text.slice(0, 120)}`)
  }
}

// House rules for every implementing and fixing agent (user decisions 2026-09-28).
const HOUSE_RULES =
  'House rules: every comment is at most 2 lines, doc comments included (one short summary, no @param/@returns lists). ' +
  'Temporary files (scratch specs, scripts, screenshots, dumps, logs) go only to your scratchpad or the OS temp directory, ' +
  'never into the repository; delete them when done and never stage or commit them.'

const STR_LIST = { type: 'array', items: { type: 'string' } }
const ROUTE_SCHEMA = {
  type: 'object',
  properties: {
    model: { type: 'string', description: 'Family alias from the trirouter Decision (haiku, sonnet, opus, fable ...); empty when it gave none.' },
    effort: { type: 'string', enum: [...EFFORTS, ''], description: 'Effort from the trirouter Decision; empty when it gave none.' },
  },
  required: ['model', 'effort'],
}
const PACKAGE_ROUTES = { route: ROUTE_SCHEMA, reviewRoute: ROUTE_SCHEMA, fixRoute: ROUTE_SCHEMA }
const STEP_ROUTES = { review: ROUTE_SCHEMA, gate: ROUTE_SCHEMA, test: ROUTE_SCHEMA, fix: ROUTE_SCHEMA }
const STEPS_SCHEMA = { type: 'object', properties: STEP_ROUTES, required: Object.keys(STEP_ROUTES) }
const PACKAGE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Short unique kebab-case id, e.g. fe-buttons.' },
    area: { type: 'string', enum: AREAS },
    prompt: { type: 'string' },
    owns: { ...STR_LIST, description: 'Repository-relative files or directories (no globs) that only this package edits; empty means the whole area.' },
    dependsOn: { ...STR_LIST, description: 'Ids of the packages that must finish first, e.g. the package that builds a shared component its consumers use.' },
    ...PACKAGE_ROUTES,
  },
  required: ['id', 'area', 'prompt', 'owns', 'dependsOn', ...Object.keys(PACKAGE_ROUTES)],
}
const ROUTING_ONLY_SCHEMA = {
  type: 'object',
  properties: { ...PACKAGE_ROUTES, steps: STEPS_SCHEMA },
  required: [...Object.keys(PACKAGE_ROUTES), 'steps'],
}
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    difficulty: { type: 'integer', minimum: 0, maximum: 4, description: 'Your own 0-4 difficulty rating of the whole task.' },
    contract: { type: 'string', description: 'Shared DTO/API contract fixed up front so backend and frontend can run in parallel; empty if none.' },
    packages: { type: 'array', items: PACKAGE_SCHEMA },
    uiChange: { type: 'boolean' },
    gates: { type: 'object', properties: { e2e: { type: 'boolean' }, http: { type: 'boolean' }, sql: { type: 'boolean' } }, required: ['e2e', 'http', 'sql'] },
    questions: { ...STR_LIST, description: 'Undecided product/UX/contract questions the user must answer before implementation.' },
    steps: { ...STEPS_SCHEMA, description: 'Trirouter routes of the shared steps: review (docs-sync), gate (validate + bookkeeping), test, fix (hand-offs, unowned failures).' },
  },
  required: ['difficulty', 'contract', 'packages', 'uiChange', 'gates', 'questions', 'steps'],
}
const IMPL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesChanged: STR_LIST,
    openQuestions: STR_LIST,
    handoffs: { ...STR_LIST, description: 'Changes needed outside your own paths, each naming the file and the exact change; the chain applies them after every package finishes.' },
  },
  required: ['summary', 'filesChanged', 'openQuestions', 'handoffs'],
}
const UNTRACKED_SCHEMA = { type: 'object', properties: { untracked: STR_LIST }, required: ['untracked'] }
const CLEANUP_SCHEMA = {
  type: 'object',
  properties: { summary: { type: 'string' }, deleted: STR_LIST, unusedCandidates: STR_LIST },
  required: ['summary', 'deleted', 'unusedCandidates'],
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

phase('Plan')
const ROUTING_RULES =
  'Routing (user decision 2026-10-11, you never choose models yourself): call the `mcp__trirouter__route_prompt` tool with ' +
  '{prompt, provider: "claude"} for each route below and copy `model` and `effort` from the `Decision:` JSON line of the result ' +
  "(a null or missing field becomes ''). `prompt` is a concise English description of that unit of work (at most ~400 characters, " +
  'no secrets, no # tags). Per package: `route` (implementing it), `reviewRoute` (reviewing its diff), `fixRoute` (fixing its ' +
  'validation/review failures). In `steps`: `review` (docs-sync over the changed files), `gate` (running scripts/validate.py plus ' +
  'bookkeeping), `test` (running the heavy suites), `fix` (cross-package hand-offs and failures no package owns). If the tool is ' +
  "missing or errors, return '' for every field: the chain then uses its documented fallback."
const planRoute = resolveRoute(taskRoute, 'plan')
let plan
let planSkipped = false
if (routerDifficulty === 1 && AREAS.includes(directArea)) {
  log(`Router difficulty 1, single area ${directArea}: orchestrator skipped; one routing-only call picks the models.`)
  planSkipped = true
  // The single package skips planning but not routing: the orchestrator only routes it and the shared steps.
  const routed = await run('gate', resolveRoute(null, 'gate'),
    `Routing only: plan nothing. The task is a single ${directArea} work package.\n${ROUTING_RULES}\n\nTask:\n${task}`,
    { agentType: 'orchestrator', phase: 'Plan', label: 'routing', schema: ROUTING_ONLY_SCHEMA })
  if (!routed) log('Routing-only call returned nothing: every step uses the fallback models.')
  plan = { difficulty: 1, contract: '', packages: [{ id: directArea, area: directArea, prompt: task, owns: [], dependsOn: [], route: routed?.route, reviewRoute: routed?.reviewRoute, fixRoute: routed?.fixRoute }], uiChange: directArea === 'frontend', gates: { e2e: false, http: false, sql: false }, questions: [], steps: routed?.steps }
} else {
  const capTable = PARALLEL_CAP.map((n, d) => d + ': ' + n).join(', ')
  plan = await run('plan', planRoute,
    `Plan this ARSM task as parallel work packages.\n` +
    `- Rate the whole task on the 0-4 difficulty scale in \`difficulty\`. The router rated it ${routerDifficulty ?? 'unknown'}; ` +
    `the chain uses the higher rating and runs at most this many implementing agents at once (difficulty: agents): ` +
    `${capTable}. Cut the work into independent, roughly even packages sized for that parallelism.\n` +
    `- Every package has one area (backend, frontend, migration only on a real schema delta) and \`owns\` a disjoint set of repository-relative ` +
    `files or directories that only it edits; all packages share one working tree.\n` +
    `- Work that other packages build on (a shared component, style token, hook or DTO) is its own package, and its consumers list it in ` +
    `\`dependsOn\`. Migration packages always run after every backend package.\n` +
    `- If backend and frontend both change, fix the shared DTO/API contract in \`contract\` so they run in parallel.\n` +
    `- Plan from a targeted scan: read what you need to assign ownership and write precise prompts, and leave reproduction and root-cause ` +
    `debugging to the owning package. Package prompts must not ask for tests, repro scripts, dev servers or validation; the chain runs those.\n` +
    `- Set gates per the root CLAUDE.md Gates section. List every undecided product/UX/contract decision in \`questions\` instead of choosing ` +
    `(then skip the routing and return '' for every route).\n- ${ROUTING_RULES}\n\nTask:\n${task}`,
    { agentType: 'orchestrator', phase: 'Plan', schema: PLAN_SCHEMA })
}
if (!plan) throw new Error('The orchestrator returned no plan.')
if (plan.questions.length) return { status: 'needs-user', questions: plan.questions, plan, calls: ran, tokensSpent: budget.spent() }
if (!plan.packages.length) throw new Error('The orchestrator returned no work packages.')

// Unique ids, normalized ownership, then a stable topological order: every dependency points to an earlier package.
const normPath = (p) => {
  let path = p.replaceAll('\\', '/')
  const glob = path.search(/[*?[{]/)
  if (glob >= 0) path = path.slice(0, glob)
  while (path.endsWith('/')) path = path.slice(0, -1)
  return path
}
const overlaps = (a, b) => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)
const byId = new Map()
plan.packages.forEach((p, i) => {
  const id = byId.has(p.id) || !p.id ? `${p.id || p.area}-${i + 1}` : p.id
  const owns = p.owns.map(normPath).filter(Boolean)
  const routes = { implement: resolveRoute(p.route, 'implement'), review: resolveRoute(p.reviewRoute, 'review'), fix: resolveRoute(p.fixRoute, 'fix') }
  byId.set(id, { ...p, id, owns: owns.length ? owns : AREA_ROOTS[p.area], routes })
})
const pkgs = [...byId.values()]
const explicitDeps = (p) => [...new Set([
  ...p.dependsOn.filter((id) => byId.has(id) && id !== p.id),
  ...(p.area === 'migration' ? pkgs.filter((q) => q.area === 'backend').map((q) => q.id) : []),
])]
const ordered = []
const placed = new Set()
while (ordered.length < pkgs.length) {
  const ready = pkgs.find((p) => !placed.has(p.id) && explicitDeps(p).every((id) => placed.has(id)))
  const next = ready || pkgs.find((p) => !placed.has(p.id))
  if (!ready) log(`Dependency cycle at ${next.id}: broken in plan order.`)
  placed.add(next.id)
  ordered.push(next)
}
ordered.forEach((p, i) => { p.index = i })
const position = new Map(ordered.map((p) => [p.id, p.index]))
for (const p of ordered) {
  const deps = new Set(explicitDeps(p).map((id) => position.get(id)).filter((j) => j < p.index))
  // Overlapping ownership in the shared working tree runs one after the other, never side by side.
  for (const q of ordered.slice(0, p.index)) if (q.owns.some((a) => p.owns.some((b) => overlaps(a, b)))) deps.add(q.index)
  p.deps = [...deps]
}
const planDifficulty = Number.isInteger(plan.difficulty) ? plan.difficulty : null
const effective = Math.min(4, Math.max(0, routerDifficulty ?? 0, planDifficulty ?? 0))
const cap = PARALLEL_CAP[effective]
log(`Difficulty router ${routerDifficulty ?? '-'}, orchestrator ${planDifficulty ?? '-'} -> ${effective}: ` +
  `${ordered.length} package(s), at most ${cap} implementing at once.`)
if (ordered.length > cap) log(`${ordered.length - cap} package(s) wait for a free slot.`)

const stepRoutes = Object.fromEntries(Object.keys(STEP_ROUTES).map((k) => [k, resolveRoute(plan.steps?.[k], k)]))
const label = (r) => `${r.model}/${r.effort}${r.source === 'router' ? '' : ` (${r.source})`}`
log(`Models (trirouter): plan ${label(planRoute)}; ` + ordered.map((p) => `${p.id} ${label(p.routes.implement)}`).join(', ') +
  `; review ${label(stepRoutes.review)}, gate ${label(stepRoutes.gate)}, test ${label(stepRoutes.test)}, fix ${label(stepRoutes.fix)}.`)
const allRoutes = [planRoute, ...Object.values(stepRoutes), ...ordered.flatMap((p) => Object.values(p.routes))]
const fallbackCount = allRoutes.filter((r) => r.source !== 'router').length
if (fallbackCount) log(`${fallbackCount} route(s) used the documented fallback (router result missing or invalid).`)

/** Runs at most `limit` thunks at once; the rest queue for a free slot. A failing thunk resolves to null. */
const limiter = (limit) => {
  let active = 0
  const queue = []
  const pump = () => {
    while (active < limit && queue.length) {
      const { thunk, resolve } = queue.shift()
      active++
      Promise.resolve().then(thunk).catch(() => null).then((value) => { active--; resolve(value); pump() })
    }
  }
  return (thunk) => new Promise((resolve) => { queue.push({ thunk, resolve }); pump() })
}
const slot = limiter(cap)
const changed = new Set()
const track = (result) => { if (result) result.filesChanged.forEach((f) => changed.add(normPath(f))) }

// implement + per-package review
// Untracked files that exist before any package runs belong to the user; the cleanup never touches them.
const baseline = await run('gate', stepRoutes.gate, 'Run `git status --porcelain --untracked-files=all` from the repository root and return the paths of ' +
  'the untracked (`??`) entries verbatim. Change nothing.', { phase: 'Plan', label: 'baseline', schema: UNTRACKED_SCHEMA })
const preexisting = (baseline?.untracked ?? []).map(normPath)

phase('Implement')
const scopeNote = (p) =>
  `Work package \`${p.id}\`. You own ONLY these paths:\n${p.owns.join('\n')}\n` +
  'Other agents edit other paths in the same working tree at the same time: do not edit, format, revert or stage anything outside ' +
  'your paths, and run no git command that changes the working tree or the index. Put any change you need outside your paths in `handoffs`.\n\n'
const packagePrompt = (p) =>
  `${p.prompt}\n\n${scopeNote(p)}` +
  (plan.contract ? `Shared contract (fixed, do not change it):\n${plan.contract}\n\n` : '') +
  (p.area === 'frontend' ? 'Apply the UI/UX policy in `.claude/agents/ui-ux-style-profile.md` yourself while implementing; it is reviewed on the diff afterwards.\n\n' : '') +
  `Original task for context:\n${task}\n\n` +
  'Do not run validation, tests, repro scripts or dev servers, even if asked above; the chain does that. Report every file you changed.\n\n' +
  HOUSE_RULES
const fixPrompt = (failures, p, busy) =>
  `Fix these validation/review failures in your scope, nothing else:\n${JSON.stringify(failures, null, 2)}\n\n` +
  (p ? scopeNote(p) : `Other agents are fixing these paths at the same time; do not edit them:\n${busy.join('\n') || '(none)'}\n\n`) +
  `Changed files so far:\n${[...changed].join('\n')}\n\n${HOUSE_RULES}`
const reviewPrompt = (what, files) =>
  `${what}\nReview ONLY these changed files (diff against ${baseRef}); do not sweep the repository:\n${files.join('\n')}`

const runPackage = async (p) => {
  const impl = await slot(() => run('implement', p.routes.implement, packagePrompt(p), { agentType: p.area, phase: 'Implement', label: `implement:${p.id}`, schema: IMPL_SCHEMA }))
  track(impl)
  if (!impl || impl.openQuestions.length) return { p, impl }
  const source = impl.filesChanged.filter((f) => /\.(cs|ts|tsx)$/.test(f))
  const ui = impl.filesChanged.filter((f) => normPath(f).startsWith(WEBUI_PREFIX))
  const [principles, audit] = await parallel([
    () => source.length ? run('review', p.routes.review, reviewPrompt('Apply naming, SOLID/OOP and the comment rule (every comment at most 2 lines, doc comments included); ' +
      'size limits are checked by scripts/validate.py, not by you.', source),
      { agentType: 'coding-principles', phase: 'Review', label: `principles:${p.id}`, schema: REVIEW_SCHEMA }) : null,
    () => plan.uiChange && ui.length ? run('review', p.routes.review, reviewPrompt('Audit against the UI/UX policy. REPORT ONLY: list findings, do not edit (a fix follows).', ui),
      { agentType: 'ui-ux-style-profile', phase: 'Review', label: `ui-ux:${p.id}`, schema: REVIEW_SCHEMA }) : null,
  ])
  track(principles)
  const uiFix = audit?.findings.length
    ? await slot(() => run('fix', p.routes.fix, fixPrompt([{ stage: 'ui-ux', detail: audit.findings }], p, []),
      { agentType: p.area, phase: 'Review', label: `fix:${p.id}:ui-ux`, schema: IMPL_SCHEMA }))
    : null
  track(uiFix)
  return { p, impl, review: [principles, audit].filter(Boolean), uiFix }
}
// A package starts once its dependencies are implemented and reviewed; the rest start at once.
const runs = []
ordered.forEach((p, i) => {
  runs[i] = (async () => {
    const deps = await Promise.all(p.deps.map((j) => runs[j]))
    if (deps.some((d) => !d?.impl || d.impl.openQuestions.length)) {
      log(`Package ${p.id} skipped: a dependency did not finish.`)
      return { p, impl: null, skipped: true }
    }
    return runPackage(p)
  })()
})
const packages = await Promise.all(runs)
const finished = packages.filter((r) => r.impl)
const unfinished = packages.filter((r) => !r.impl).map((r) => r.p.id)
if (unfinished.length) log(`Unfinished packages: ${unfinished.join(', ')}.`)

// Cross-package changes, one agent per area, after every package is done.
const areaOfText = (text, fallback) => {
  if (/AutoService\.WebUI/.test(text)) return 'frontend'
  return /AutoService\.(ApiService|AppHost|ServiceDefaults)/.test(text) ? 'backend' : fallback
}
const handoffs = finished.flatMap((r) => r.impl.handoffs.map((change) => ({ from: r.p.id, area: areaOfText(change, r.p.area), change })))
const applied = []
if (handoffs.length) {
  log(`${handoffs.length} cross-package change(s) handed off.`)
  const areas = [...new Set(handoffs.map((h) => h.area))]
  applied.push(...(await parallel(areas.map((area) => () => slot(() => run('fix', stepRoutes.fix,
    `Apply these changes that work packages requested outside their own paths, nothing else:\n` +
    handoffs.filter((h) => h.area === area).map((h) => `- (${h.from}) ${h.change}`).join('\n') + '\n\n' +
    (plan.contract ? `Shared contract (fixed, do not change it):\n${plan.contract}\n\n` : '') +
    `Do not run validation or tests; the chain does that. Report every file you changed.\n\n${HOUSE_RULES}`,
    { agentType: area, phase: 'Implement', label: `handoff:${area}`, schema: IMPL_SCHEMA }))))).filter(Boolean))
  applied.forEach(track)
}
const openQuestions = [...finished, ...applied.map((impl) => ({ impl }))].flatMap((r) => r.impl.openQuestions)
if (openQuestions.length) return { status: 'needs-user', questions: openQuestions, plan, packages, applied, calls: ran, tokensSpent: budget.spent() }

// gate (docs-sync runs beside it: it edits docs only, which the gate does not check)
phase('Gate')
const docsSync = run('review', stepRoutes.review, reviewPrompt('Sync the Claude instruction layer and READMEs with these changes; edit documentation files only.', [...changed]),
  { agentType: 'docs-sync', phase: 'Review', schema: REVIEW_SCHEMA })
const runGate = () => run('gate', stepRoutes.gate,
  `Run \`python scripts/validate.py --base ${baseRef} --json\` from the repository root and return \`passed\` and the failing stages ` +
  `with their detail lines, verbatim. Change nothing.`,
  { phase: 'Gate', schema: GATE_SCHEMA })

const FILE_REF = /[\w-]+\.(?:tsx?|jsx?|mjs|cs|py|css|json)\b/
const LABEL_LINE = /^\w+:$/
const WEBUI_ROOT = WEBUI_PREFIX.slice(0, -1)
/** Length of `path` (or its WebUI-relative form) found in a tool output line, 0 when absent. */
const matchLength = (stage, line, path) => {
  const text = line.replaceAll('\\', '/')
  // tsc and eslint print WebUI-relative paths; a package owning the whole WebUI takes them at the lowest priority.
  if (path === WEBUI_ROOT && stage === 'frontend' && FILE_REF.test(text)) return 1
  for (const candidate of [path, path.startsWith(WEBUI_PREFIX) ? path.slice(WEBUI_PREFIX.length) : '']) {
    const at = candidate ? text.indexOf(candidate) : -1
    if (at >= 0 && !/[\w-]/.test(text.charAt(at + candidate.length))) return candidate.length
  }
  return 0
}
/** The finished package owning the most specific path a line names, or null. */
const ownerOf = (stage, line) => {
  let best = null
  let bestLength = 0
  for (const r of finished) for (const path of r.p.owns) {
    const length = matchLength(stage, line, path)
    if (length > bestLength) { best = r.p; bestLength = length }
  }
  return best
}
const areaFallback = (stage, line) => {
  const area = stage === 'frontend' || stage === 'shadows' || /AutoService\.WebUI/.test(line) ? 'frontend' : 'backend'
  return { key: `area:${area}`, owner: null, area }
}
// A line naming an owned path goes to that package; a line naming no file follows the previous line (eslint prints
// the file once above its issues); an unowned file goes to one agent per area.
const failureTarget = (stage, line, previous) => {
  const owner = ownerOf(stage, line)
  if (owner) return { key: owner.id, owner, area: owner.area }
  return previous && !FILE_REF.test(line) ? previous : areaFallback(stage, line)
}
const assignFailures = (failures) => {
  const groups = new Map()
  const add = (target, stage, lines) => {
    if (!groups.has(target.key)) groups.set(target.key, { owner: target.owner, area: target.area, failures: [] })
    const list = groups.get(target.key).failures
    let entry = list.find((x) => x.stage === stage)
    if (!entry) {
      entry = { stage, detail: [] }
      list.push(entry)
    }
    entry.detail.push(...lines)
  }
  for (const f of failures) {
    let previous = null
    let preamble = [] // tool noise before the first file line travels with it
    for (const line of (f.detail.length ? f.detail : [f.stage]).filter((l) => !LABEL_LINE.test(l.trim()))) {
      if (!previous && !ownerOf(f.stage, line) && !FILE_REF.test(line)) { preamble.push(line); continue }
      previous = failureTarget(f.stage, line, previous)
      add(previous, f.stage, [...preamble, line])
      preamble = []
    }
    if (preamble.length) add(areaFallback(f.stage, preamble.join(' ')), f.stage, preamble)
  }
  return [...groups.values()]
}

// The cleanup deletes only what this run left behind that is no deliverable; tracked files are only reported.
const cleanupPass = (label) => run('gate', stepRoutes.gate,
  'Clean the working tree after this run of the ARSM agent chain. List untracked entries with ' +
  '`git status --porcelain --untracked-files=all` and delete every untracked file or directory that is neither a deliverable ' +
  '(the changed files below) nor present before the run (the pre-existing list below): scratch specs and scripts, screenshots, ' +
  'dumps, logs, temporary configs, leftover worktrees. Also delete app/AutoService.WebUI/test-results and ' +
  'app/AutoService.WebUI/playwright-report if present. Never delete tracked files, pre-existing untracked files or anything ' +
  'else that git ignores. In `unusedCandidates` list tracked files this run left unused (no longer referenced after the ' +
  'change) for the user to approve; do not delete them.\n' +
  `Changed files (deliverables):\n${[...changed].join('\n') || '(none)'}\n` +
  `Pre-existing untracked files:\n${preexisting.join('\n') || '(none)'}`,
  { phase: 'Review', label, schema: CLEANUP_SCHEMA })

let gate = await runGate()
for (let round = 1; round <= 2 && gate?.passed === false; round++) {
  const groups = assignFailures(gate.failures)
  const busy = groups.filter((g) => g.owner).flatMap((g) => g.owner.owns)
  const fixLabel = (g) => (g.owner ? g.owner.id : `area-${g.area}`)
  log(`Fix round ${round}: ${groups.map(fixLabel).join(', ')}`)
  const fixes = await parallel(groups.map((g) => () => slot(() => run('fix', g.owner ? g.owner.routes.fix : stepRoutes.fix, fixPrompt(g.failures, g.owner, busy), {
    agentType: g.area, phase: 'Gate', label: `fix:${fixLabel(g)}:${round}`, schema: IMPL_SCHEMA,
  }))))
  fixes.forEach(track)
  gate = await runGate()
}
const [docs, cleanup] = await Promise.all([docsSync, cleanupPass('cleanup')])
track(docs)
if (!gate?.passed) return { status: 'gate-failed', gate, plan, packages, applied, docs, cleanup, calls: ran, tokensSpent: budget.spent() }

phase('Test')
const files = [...changed]
const tests = []
if (plan.gates.e2e) tests.push(await run('test', stepRoutes.test,
  `Generate missing coverage first if this is a new feature, then run \`python scripts/select-e2e-specs.py --base ${baseRef} --run\` ` +
  `(targeted specs, 3 workers) and report the sanitized summary.\nChanged files:\n${files.join('\n')}`,
  { agentType: 'e2e-playwright-test', phase: 'Test' }))
// All suites share the runner's summary file, so they run one after another.
if (plan.gates.http) tests.push(await run('test', stepRoutes.test, `Run the HTTP endpoint gate for these changes:\n${files.join('\n')}`,
  { agentType: 'http-endpoint-test', phase: 'Test' }))
if (plan.gates.sql) tests.push(await run('test', stepRoutes.test, `Run the SQL gate for these changes:\n${files.join('\n')}`,
  { agentType: 'sql-database-test', phase: 'Test' }))
const finalCleanup = tests.length ? await cleanupPass('cleanup:after-tests') : null

return {
  status: 'done',
  difficulty: { router: routerDifficulty, orchestrator: planDifficulty, effective, parallel: cap },
  plan, packages,
  // Planned routes ({model, effort, source}: router, partial or fallback) and `calls`: what each agent really ran on.
  models: { plan: planRoute, steps: stepRoutes, packages: Object.fromEntries(ordered.map((p) => [p.id, p.routes])), calls: ran },
  unfinished, applied, docs, cleanup, finalCleanup, gate, tests, changed: files,
  tokensSpent: budget.spent(),
}
