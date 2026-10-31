// Runs .claude/workflows/arsm-chain.js with stubbed workflow hooks: scenario JSON on stdin, run report JSON on stdout.
import { readFileSync } from 'node:fs'

const AsyncFunction = (async () => {}).constructor
const source = readFileSync(new URL('../../.claude/workflows/arsm-chain.js', import.meta.url), 'utf8')
const body = source.replace(/^export const meta/m, 'const meta')
const scenario = JSON.parse(readFileSync(0, 'utf8'))
const { packages, files = {}, repoRoot = null, gateFailures = [], bugsFound = [], proofFile = '' } = scenario

const route = { model: 'sonnet', effort: 'high' }
const steps = { review: route, gate: route, test: route, fix: route }
const plannedPackages = packages.map((p) => ({ prompt: p.id, dependsOn: [], route, reviewRoute: route, fixRoute: route, ...p }))
const noWork = { summary: '', filesChanged: [], openQuestions: [], handoffs: [], bugsFound: [] }
const calls = []
const logs = []
let gateRuns = 0

const answer = (label, opts) => {
  if (opts.agentType === 'orchestrator') {
    const gates = { e2e: false, http: false, sql: false, unit: false }
    return { difficulty: 2, contract: '', packages: plannedPackages, uiChange: true, gates, questions: [], steps }
  }
  if (label === 'baseline') return repoRoot === null ? null : { repoRoot, untracked: [] }
  if (label.startsWith('implement:')) return { ...noWork, filesChanged: files[label.slice('implement:'.length)] ?? [], bugsFound }
  if (label.startsWith('fix:')) return noWork
  if (label.startsWith('prove:')) return { testFile: proofFile, filesChanged: [], passesWithFix: true, failsWithoutFix: false, note: '' }
  if (label.startsWith('test:')) return { passed: true, summary: '', filesChanged: [], failures: [] }
  if (label.startsWith('cleanup')) return { summary: '', deleted: [], unusedCandidates: [] }
  if (opts.schema.required.includes('findings')) return { summary: '', filesChanged: [], findings: [], bugsFound: [] }
  gateRuns += 1
  return gateRuns === 1 && gateFailures.length ? { passed: false, failures: gateFailures } : { passed: true, failures: [] }
}
const agent = async (prompt, opts) => {
  const label = opts.label ?? opts.agentType ?? 'gate'
  calls.push({ label, agentType: opts.agentType ?? null, prompt })
  return answer(label, opts)
}
const parallel = (thunks) => Promise.all(thunks.map((thunk) => Promise.resolve().then(thunk)))

const run = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', 'budget', body)
const result = await run({ task: 'scenario', difficulty: 2 }, agent, parallel, () => {}, (message) => logs.push(message), { spent: () => 0 })
const auditSkipped = result.packages.map((r) => r.auditSkipped ?? null)
process.stdout.write(JSON.stringify({ status: result.status, changed: result.changed, auditSkipped, calls, logs }))
