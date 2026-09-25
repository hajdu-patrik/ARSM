# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/);
dates are ISO 8601. Every entry ends with a development-time / cost metrics line - see
`CLAUDE.md` -> Changelog & Development Metrics for how it's measured.

---

## [Unreleased]

### Changed
- WebUI UI/UX consistency pass: recurring elements now render through one shared primitive instead of
  per-page copies of the same class strings.
  - New shared `StatusPillBadge` (`components/common`); the scheduler `StatusBadge` and the quotes
    `QuoteStatusBadge` render through it and keep their own status color maps.
  - New shared tokens in `utils/styles`: toolbar row/actions layout, compact row header and row
    actions cluster, centered loading wrapper, compact inline/stacked rows, row hover motion
    (`surfaceStyles.ts`), monospaced identifier text (`textStyles.ts`) and the compact chip-button
    base shared by Customers and Scheduler (`buttonStyles.ts`). Customers, Inventory, Quotes,
    Scheduler, Admin, Company results, Settings and the sidebar consume them.
  - Outliers unified on the dominant variant (user-approved look changes): the vehicle specs grid
    uses the shared two-column grid (row gap 4px -> 8px), the admin mechanic list and the scheduler
    month list use the shared dashed empty-state box, the Settings page spinner matches every other
    spinner (`h-8 w-8`), and the catalog and quote-line row actions use the shared actions cluster.
  - Everything else is pixel-identical: a before/after screenshot comparison of 9 screens at 1440px
    (light and dark) and 320px differed only on the vehicle specs grid.

_Dev time: ~52m wall-clock. Cost: ~$4.00 (2 `arsm-chain` runs, 400,188 output tokens, every
package and review routed to sonnet; output-token-only estimate - excludes input tokens and cache
writes/reads, so a lower bound, not a bill)._

### Fixed
- Scheduler: a background refresh trigger (SSE live-update, profile-picture update, or the periodic
  poll) that arrived while a previous refresh pass was still in flight was silently dropped instead
  of being retried, so an edited appointment's change could go unreflected in the UI until the next,
  unrelated trigger happened to fire. `useSchedulerDataSync`'s background-refresh task now queues one
  trailing pass instead of dropping the trigger.
- Scheduler: the query-cache write for a mutated appointment (`writeAppointmentToSchedulerCache`)
  bucketed by UTC day/month while the Zustand store and the month-query keys it feeds use local time,
  so an appointment could be dropped from, or misplaced in, the cached "today"/month bucket whenever
  its local and UTC calendar day differ. Both bucket checks now use local time, matching the rest of
  the scheduler data path.

_Dev time: ~6m wall-clock (implementation only - excludes the preceding investigation and
clarification discussion). Cost: not measured (direct session work, no token-spend API)._
