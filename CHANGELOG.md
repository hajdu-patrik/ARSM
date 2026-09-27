# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/);
dates are ISO 8601. Every entry ends with a development-time / cost metrics line - see
`CLAUDE.md` -> Changelog & Development Metrics for how it's measured.

---

## [Unreleased]

### Changed
- HTTP test suite now actually verifies status codes and provisions its own data (2026-09-27).
  - Every request block in `tests/API/**/*.http` carries a real httpyac assertion (`?? status == N`,
    plus body-code checks) instead of a status written only in a comment; before this the runner
    counted every completed request as passed. Files stay <= 250 lines (several split by concern).
  - Self-provisioning: no hardcoded entity ids (`delete-invariants.http` registers and deletes its own
    disposable mechanics instead of deleting id 8 every run); files create their own customers,
    vehicles, parts and mechanics with run-unique emails, plates, VINs and phone numbers and delete
    them at the end; every file starts by clearing the shared httpyac cookie jar, because httpyac's
    file order is not stable. `tests/API/_setup/ensure-test-accounts.http` provisions the plain
    mechanic test account and re-creates it when its login fails (only for an `@example.test`
    address); `tests/API/zz-cleanup/purge-test-mechanics.http` deletes leftover test-prefixed
    `@example.test` mechanics (never demo `@example.com` accounts, the admin or the test mechanic).
  - Latent test bugs fixed: timestamp VINs were 20 characters (httpyac `$timestamp` is milliseconds)
    and every such vehicle was rejected; several files registered the same fixed phone number; the
    password-change test never restored the original password; `=== "x"` / `== "x"` body
    assertions could never match (httpyac compares the quoted text literally).
  - API: the Development-only login rate limit is 300/min (was 100) because the self-provisioning
    suite logs in about 120 times per run; production stays 10/min.
  - Runner: failed HTTP requests are listed with file, line, title, actual status and the failing
    assertion, even when the secret sanitizer breaks httpyac's JSON.
  - Verification: two consecutive full HTTP runs, 807/807 requests and all 4 Python checks passed;
    validate gate passed.

_Dev time: ~1h29m wall-clock. Cost: ~$8.23-$16.45 (1 `arsm-chain` run, 822,591 output tokens,
sonnet-opus range; output-token-only estimate - excludes input tokens and cache writes/reads, so a
lower bound, not a bill)._

- `arsm-chain` model policy fixed instead of routed per step (2026-09-27): planning and review run on
  opus for difficulty 0-2 and fable for 3-4 (effort high), implementation and every fix round on
  sonnet at max effort, the validate gate and test agents on sonnet; the jev-router Route phase was
  removed. `CLAUDE.md`, the orchestrator agent and the workflow reminder hook describe the new policy.

_Dev time: ~15m wall-clock. cost: not measured._

- Admin mechanic list and icon-button hover (2026-09-27).
  - Admin "Mechanics" list: a Customers-style toolbar (name-only, accent-insensitive search via the
    shared `utils/textSearch.ts` normaliser, and an ascending/descending name sort toggle), and the
    list shows 5 rows at a time with internal scrolling (height measured from the real row). New
    `admin.mechanicSearchPlaceholder` / `admin.noMechanicsFound` EN/HU keys; state lives in
    `useMechanicListState.ts`.
  - Icon-only actions app-wide (eye, pencil, trash, download, ...): hover scales to 115% with a
    tone-colored soft background, and the hover icon color never loses contrast (4.7:1-12:1 on the
    hover background, both themes). A natively disabled icon action - e.g. the quote list trash for
    non-draft quotes - is grey with no hover at all, and keeps its tooltip and not-allowed cursor.
  - Fixed: the loading-splash animation stopped for users with "reduced motion" / Windows animation
    effects off, because the 2026-09-27 CSP change had added an unrequested reduced-motion rule; the
    stylesheet is again identical to the original inline CSS.
  - Verification: validate gate passed; targeted E2E 70/70 (the admin delete spec now targets the new
    mechanic's own row instead of the last row, since the list is sorted by name); runtime checks of
    the 5-row window, search, sort, hover scale/background and the disabled state in both themes.

_Dev time: ~33m wall-clock. Cost: ~$13.20-$26.39 (1 `arsm-chain` run, 1,319,501 output tokens,
sonnet-opus range; output-token-only estimate - excludes input tokens and cache writes/reads, so a
lower bound, not a bill)._

- Closed the open audit items: authorization test suite, deployment checklist, Lighthouse and ZAP
  follow-ups (2026-09-27).
  - Scans: OWASP ZAP baseline (WebUI) and API scan (OpenAPI-driven, active) against localhost found
    0 failures (172 passes); the remaining WebUI warnings are static-host headers, now covered by the
    checklist, and the two API "error disclosure" hits were false positives (the OpenAPI document
    describes 500 responses). Lighthouse on the built login page: desktop 100/100/100, mobile
    performance 92 with accessibility and best practices 100.
  - Tests: new `tests/API/authz/` suite (7 files, 82 cases) with real httpyac `?? status` assertions -
    admin-only routes, profile-picture IDOR, non-existent ids, `limit` edge values, stale session and
    foreign Origin. Role-independent files sign in with the admin account. `profile-name-validation-
    and-password.http` now restores the original password, so the suite is idempotent.
  - Runner: `run-local-test-suite.py` lists every failed HTTPYAC request (file, line, title, actual
    status) in the sanitized summary; before this, failures were counted but never identified.
  - Docs: `docs/deployment-security-checklist.md` (static-host headers incl. `frame-ancestors`, cache
    policy, forwarded-header/proxy trust, rate-limiter topology, required config keys), linked from
    both READMEs.
  - WebUI: logo `width`/`height`, `fetchPriority` and an `index.html` preload (Lighthouse LCP
    discovery), the white logo re-encoded 90 kB -> 25 kB lossless, the language toggle's accessible
    name now starts with its visible text (WCAG 2.5.3), and the LoadingPage keyframes moved to a
    stylesheet so the CSP is `style-src 'self'` (only `style-src-attr 'unsafe-inline'` remains).
  - Verification: validate gate passed; targeted E2E 70/70; HTTP suite 623/631 - the 8 failures are
    all the plain-mechanic test login answering 401 locally (see the report); a before/after pixel
    diff showed no visible change (light theme byte-identical, dark logo resampling only).

_Dev time: ~1h50m wall-clock. Cost: ~$10.96-$21.93 (1 `arsm-chain` run, 1,096,486 output tokens,
sonnet-opus range; output-token-only estimate - excludes input tokens and cache writes/reads, so a
lower bound, not a bill)._

- Security, performance and accessibility hardening from the 2026-09-26 project audit (2026-09-26).
  - Auth: the token-refresh rate limit is partitioned per client instead of one global bucket; a
    password change revokes every refresh token and the current access token, then issues a fresh
    cookie pair so the current tab stays signed in; the login user-not-found path runs a dummy
    password hash so response time no longer reveals registered emails; auth and profile fields are
    capped (email 150, names 50, phone 20, passwords 128) before any hashing work;
    `JwtSettings:ExpirationMinutes` now drives the access-token lifetime (default 10).
  - API: global problem+json exception handler (no stack trace in any environment, malformed JSON is
    a plain 400); `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` headers; Brotli/Gzip
    response compression (SSE streams excluded); every unbounded list endpoint takes an optional
    `limit` capped at 500 (`Pagination/ListQueryLimits`); appointment, vehicle and customer reads
    project straight into their DTOs; the appointment list vehicle DTO carries `customerId` instead of
    an unused nested customer summary; `pg_trgm` GIN indexes back the customer name/plate search
    (migration `AddTrigramSearchIndexes`); the profile-picture verification runs 10 requests at once.
  - Platform: `/health` checks the database (still Development-only), MinIO and the API have real
    readiness checks in the AppHost, WebUI waits for the API, `WebUi:SiteUrl` is required, and Npgsql
    command spans appear in OpenTelemetry traces.
  - WebUI: dark text on the accent CTA, segmented control and toggle pill (1.77:1 -> 8.28:1 light,
    2.81:1 -> 6.23:1 dark); placeholder text 3.38:1 -> 5.11:1; the compact filter select uses the
    shared focus ring; background requests no longer trigger the global 500 redirect; the two error
    illustrations shrank from ~290 kB to ~55 kB each; the built `index.html` carries a strict CSP; the
    Settings and RegisterMechanic style re-export barrels are gone. The 320px calendar day-cell width
    is documented as an accepted touch-target exception.
  - Fixed: production builds rendered a blank page since the Vite 8 upgrade (a circular vendor chunk
    import crashed start-up); the build now uses Rolldown `codeSplitting` with strict execution order.
  - Verification: validate gate passed; HTTP suite passed (new field-length suites); SQL suite passed
    (new trigram contract check); 70/70 targeted E2E specs passed; a before/after pixel diff of 40
    built-app screens (10 pages, light/dark, 1280px/360px) changed only the CTA, tab and placeholder
    colors and the re-encoded error illustrations, with zero CSP violations.

_Dev time: ~1h44m wall-clock. Cost: ~$7.63-$15.25 (1 `arsm-chain` run, 762,743 output tokens,
packages routed to sonnet and opus; output-token-only estimate - excludes input tokens and cache
writes/reads, so a lower bound, not a bill)._

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
- Settings: deleting the profile with a wrong current password (401/403) showed the raw i18n key
  `settings.currentPasswordIncorrect`, which never existed, in the error toast. It now shows the
  existing "Current password is invalid." / "A jelenlegi jelszó hibás." message
  (`settings.errors.currentPasswordInvalid`).

_Dev time: ~2m wall-clock (implementation after the user's decision; the investigation happened
during the unification task). Cost: not measured (direct session work, no workflow run)._

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
