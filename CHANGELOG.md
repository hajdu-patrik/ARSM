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
  - A before/after screenshot comparison at 1440px (light and dark) and 320px differed only on the
    vehicle specs grid. Correction (2026-09-25): five of its nine screens (Scheduler, Inventory,
    Company results, Admin, Settings) were captured under the 3s loading splash, and the comparison
    used Playwright's default per-pixel tolerance, so only Customers, Quotes and the quote editor were
    really compared; the changes on the other screens were class-identical or not visible at rest.

_Dev time: ~52m wall-clock. Cost: ~$4.00 (2 `arsm-chain` runs, 400,188 output tokens, every
package and review routed to sonnet; output-token-only estimate - excludes input tokens and cache
writes/reads, so a lower bound, not a bill)._

- WebUI project-wide unification of colors, typography, sizes and texts (2026-09-25).
  - Colors: new shared semantic tones in `utils/styles/toneStyles.ts` (badge, dot, feedback surface,
    text and filter-chip recipes per tone). Status badges, calendar dots, status filter chips, toasts,
    notices, the overdue panel and the delete-profile panel resolve their colors through a
    status-to-tone map (`APPOINTMENT_STATUS_TONE`, `QUOTE_STATUS_TONE`) instead of re-typed palette
    classes. Toast and alert borders follow the dominant notice strength (`/60`). The medium and
    compact chip buttons share one primary and one danger action tone; the Customers and Scheduler
    compact chips are now one shared set (`compactChipNeutral/Primary/DangerButtonClass`), and
    `customerCompactActionStyles.ts` is gone.
  - Typography and sizes: inline text classes moved onto the existing text tokens, plus
    `displayHeadingTextClass`; one icon size scale (`smallIconClass`, `defaultIconClass`,
    `largeIconClass`) replaces the size literals of every icon, with compact chip icons unified on
    `h-3.5`; one `textareaClass` (6.5rem) for the three textareas; `rowIconActionNeutralClass` for
    the customer card expand toggle. Redundant or conflicting overrides on shared tokens were
    removed (error page CTA padding, login/admin `sm:text-base`, profile upload color, detail row
    padding, duplicated `min-h-11`/`shrink-0`/`min-w-0`).
  - Texts: EN labels, titles and buttons use sentence case; HU validation messages and the
    "Save changes" button use their dominant wording. Keys with identical EN and HU text were merged
    (724 -> 607 keys per language) onto a new `common.*` namespace (`actions`, `sort`, `fields`,
    `placeholders`, `validation`) or onto the one existing key of their own namespace; server
    validation messages map to `common.validation.*` for both admin and settings.
  - Verified with `validate.py`, the full E2E suite (70 passed) and a before/after screenshot
    comparison of 13 screens at 1440px (light and dark) and 320px whose every difference matches
    the changes above.

_Dev time: ~1h26m wall-clock. Cost: not measured (direct session work, no workflow run)._

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
