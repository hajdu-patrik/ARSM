# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/);
dates are ISO 8601. Every entry ends with a development-time / cost metrics line - see
`CLAUDE.md` -> Changelog & Development Metrics for how it's measured.

---

## [Unreleased]

### Changed
- WebUI readability down to 320 px, consistent list UX and SEO fixes (2026-10-04).
  - Audit first (Impeccable skill): 14 scenes at 320/390/768/1440 px, light/dark, HU/EN, with
    mocked worst-case data; truncated text dropped from 239 findings to 23, all of them desktop table
    cells that keep an ellipsis with a full-text `title` tooltip.
  - Fixes: customer names no longer cut to 3 letters at 768 px; list toolbars wrap and their buttons
    never ellipsize or stick out; the appointment detail modal wraps its date, mileage and power and
    fits short viewports (`Modal` `fitViewport`); '+N' badges no longer cover status dots or
    initials; long values wrap in customer, vehicle, history, quote line and mechanic list views;
    44 px filter controls below lg; un-clipped select focus rings; the closed mobile drawer is inert.
  - UX (user-approved): 2-line titles and a 2-column grid in the quote/catalog mobile tiles; compact
    month and VAT rows with a header strip in company results on mobile (below 360 px one labelled
    line per value, so an amount never splits); icon-only customer
    edit/delete; a denser scheduler filter bar; collapsed sidebar by default at tablet width;
    status-specific quote lock notice (accepted/rejected quotes no longer claim the validity can be
    extended); a filter-aware empty month list; shorter search placeholders.
  - SEO: `/quotes`, `/inventory` and `/company-results` no longer get the not-found title and a
    `/404` canonical; app name 'ARSM – Appointment and Resource Scheduling Management'; a 1200x630
    PNG social card with an absolute URL; robots stays noindex (user decision).
  - Verification: validate gate passed; E2E 72/72; before/after screenshot sweep reviewed.

_Dev time: ~24h43m wall-clock (2026-10-03 12:17 to 2026-10-04 13:01 UTC, including an overnight
session break). Cost: ~$20.95-$41.91 (1 `arsm-chain` run, 2,095,253 output tokens, sonnet-opus
range; output-token-only estimate - excludes input tokens, cache writes/reads and the follow-up
agents run outside the workflow, so a lower bound, not a bill)._

- Deployment security checklist kept local (2026-09-28).
  - Docs: the checklist moved to the gitignored deployment kit with the other deployment docs; the
    READMEs keep their Deployment Security Notes, and code comments no longer point to the file.

_Dev time: ~15m wall-clock. cost: not measured._

- Azure Blob Storage provider for profile pictures (2026-09-28).
  - API: `ObjectStorage:Provider` selects `S3` (default when unset, so existing configs keep working;
    local RustFS, Cloudflare R2, AWS S3) or `AzureBlob` (`Azure.Storage.Blobs` 12.29.2; connection
    string, container from `BucketName`, startup container check like the bucket check). Both share
    one object-key format (`ProfilePictureObjectKeys`).
  - Verification: the profile-picture check (upload, WebP read-back, ETag and 304, size limits,
    delete, 404 after delete) and the quote PDF check pass against Azurite with the Blob provider;
    full HTTP suite on the RustFS-backed AppHost
    872/872 plus the 4 Python checks; validate gate (security audit included) passed.

_Dev time: ~25m wall-clock. cost: not measured._

- Two-line comment rule applied repo-wide, cleanup pass in the agent chain, CI green again (2026-09-28).
  - Rules (user decisions): every comment is at most 2 lines, doc comments and Python docstrings
    included; temporary files live only in the scratchpad/OS temp and are never committed. Baked into
    CLAUDE.md, the coding-principles agent and skill, the reminder hook and every arsm-chain
    implement/fix/hand-off prompt; arsm-chain snapshots pre-existing untracked files and runs a cleanup
    pass beside docs-sync (and after tests) that deletes only what the run left behind and lists
    tracked files the change left unused, for approval.
  - Refactor: ~430 files across API, AppHost, ServiceDefaults, WebUI, tests, scripts and workflows
    condensed to 1-2 line comments (about 5,600 comment lines removed); code verified
    unchanged by comparing comment-stripped sources against HEAD. The dead commented-out browser
    projects in `playwright.config.ts` went too, and a stale "no appointment DELETE route" comment was
    corrected.
  - `scripts/validate.py` lints in batches (a large diff exceeded the Windows command-line limit), and
    `QuoteEndpoints.Helpers.cs` was split (line-snapshot helpers moved to `QuoteEndpoints.LineSnapshots.cs`)
    to meet the 300-line type limit it had exceeded since before the gate existed.
  - CI: the `.NET` frontend build gets its Vite origins, the HTTP/SQL job generates a JWT secret long
    enough for the API, trusts the HTTPS dev certificate for the Python checks, annotates failed
    requests, and the runner provisions test accounts (`_setup`) before the suite; both workflows are
    green on GitHub.
  - Verification: validate gate passed; full suites on the AppHost: Playwright 72/72, HTTP 872/872
    (setup included) plus the 4 Python checks, SQL 24/24.

_Dev time: ~1h45m wall-clock. Cost: ~$16.66-$33.33 (2 `arsm-chain` runs, 1,666,412 output tokens,
sonnet-opus range; output-token-only estimate - excludes input tokens and cache writes/reads, so a
lower bound, not a bill)._

- Fresh-database start, RustFS instead of MinIO, `/alive`, HSTS behind a proxy (2026-09-28).
  - API: `/alive` (process self-check only, bare `Healthy`) is mapped in every environment for
    platform probes and uptime monitors; `/health` stays Development-only.
  - Fixed: `UseHsts()` ran before `UseForwardedHeaders()`, so behind a proxy the API saw plain http
    and sent no HSTS header; forwarded headers now come first (verified behind the proxy chain).
  - Fixed: the API never started on an empty database - the BackfillDemoData migration's
    mechanic-less rows failed the startup integrity check before the legacy reset ran; the reset
    now runs first while no mechanic and no Identity account exists.
  - Fixed: the MinIO images were withdrawn from Docker Hub and quay.io; the AppHost and the CI
    HTTP/SQL job run RustFS 1.0.0 instead (resource, parameter and port names unchanged).
  - Fixed: the `.NET` workflow's frontend build had failed since the strict CSP because it lacked
    `VITE_API_URL`.
  - Verification: the API ran in `Production` on an empty database behind a local reverse-proxy
    chain (HSTS present, client IP resolved, a forged `X-Forwarded-For` ignored); HTTP suite 872/872
    and SQL 24/24 on the RustFS-backed AppHost; validate gate passed.

_Dev time: ~45m wall-clock. cost: not measured._

- Flat item surfaces, test suites in GitHub Actions, codebase cleanup, no fable (2026-09-28).
  - WebUI: item-level gradient overlays are gone, so every card, panel, modal and sidebar section
    shows its own solid background token (scheduler intake selected-day box and customer lookup
    panel, shared Modal, sidebar header/footer, Login card and its static `#login-shell` copy,
    Settings delete-profile section); the seven `arsm-*-sheen` CSS rules were deleted. Page-level
    backdrops (body, auth, shell, error page, splash) and the calendar scroll fade stay.
  - WebUI overflow fixes: the Customers toolbar actions no longer clip at 768 px (`sm:shrink-0` on
    the actions wrapper), and the quote editor totals wrap instead of ellipsizing a large amount.
  - CI: new `.github/workflows/tests.yml`. `e2e-playwright` runs the whole Playwright suite on the
    Vite dev server with the mocked API (mkcert from apt); `api-http-sql` starts PostgreSQL 18.3
    and MinIO containers plus the API (Development, demo seed) with per-run generated, masked
    credentials, creates the read-only `ai_agent_test_user`, then runs
    `run-local-test-suite.py http sql`. No repository secret is needed.
  - Cleanup: deleted the unused `tailwind.config.js` (Tailwind v4, no `@config`), the empty
    `public/sitemap.xml`, the historical Dashboard-UI-UX design notes with their `.pen` file and
    its white logo, and three unreferenced symbols (`hasRequiredQuoteLineFields`,
    `CompanyResultsState`, `RefreshToken.IsActive`).
  - AI workflow: fable is not used in this repository for now; `arsm-chain` plans and reviews on
    opus at every difficulty (CLAUDE.md, orchestrator agent, reminder hook, READMEs updated).
  - Docs: `docs/PROJECT-OVERVIEW.md` (gitignored) brought up to date as of 2026-09-27.
  - Verification: validate gate passed; E2E 72/72 in CI mode (serial, own dev server, as on the
    runner); before/after screenshots of login, scheduler, intake, customers and settings at 390,
    768 and 1440 px in both themes differ only in the removed overlays and the toolbar fix.
    `tests.yml` has not run on GitHub yet (local YAML check only).

_Dev time: ~1h23m wall-clock. Cost: ~$27.49-$54.99 (1 `arsm-chain` run, 2,749,482 output tokens,
sonnet-opus range; output-token-only estimate - excludes input tokens and cache writes/reads, so a
lower bound, not a bill)._

- Remaining MEDIUM/LOW/INFO audit items closed (2026-09-27).
  - API: CSRF double-submit token. Login, refresh and password change issue an `autoservice_csrf`
    cookie; every unsafe cookie-bearing `/api` request except login must echo it in `X-CSRF-Token`
    (`CsrfDoubleSubmitMiddleware`, constant-time compare, `403 csrf_token_invalid`). The WebUI API
    client adds the header automatically.
  - Appointments: admin-only `DELETE /api/appointments/{id}` (publishes the live update; linked
    quotes keep existing, their FK is `SET NULL`), plus a delete action with a confirmation modal in
    the scheduler detail view, visible to admins only.
  - WebUI: /login paints a static pre-React copy of its first frame (the splash on top, the Login
    logo beneath), so mobile LCP no longer waits for the JS; LoadingPage removes it on its first
    commit. Throttled mobile profile: LCP ~2.27 s -> ~1.05 s, CLS 0, and the handoff frame matches
    the splash pixel for pixel apart from logo-edge anti-aliasing.
  - CSP: `style-src-attr 'unsafe-inline'` is gone; LoadingPage styles live in a stylesheet and the
    mechanic list writes its max-height through the CSSOM.
  - Styles: dark-mode "today" marker text token in the calendar, 44 px phone chips below 640 px,
    10/11 px text raised to 12 px (`text-xs`).
  - Tests: HTTP files capture the CSRF token in a post-response script (a request-less
    `@CsrfToken` region is re-evaluated as a global for every request and kept stale tokens), and
    401 checks run with `# @no-cookie-jar`; profile-picture 304 ETag revalidation check; new
    appointment-delete HTTP and E2E coverage.
  - Verification: validate gate passed; HTTP suite 872/872 plus all 4 Python checks; E2E 72/72
    (the new delete spec's two locator bugs fixed and re-run twice); live browser check of the CSRF
    header on logout and of the built app's CSP (no violations).

_Dev time: ~2h18m wall-clock. Cost: ~$22.00-$109.99 (1 `arsm-chain` run, 2,199,878 output tokens,
sonnet-fable range; output-token-only estimate - excludes input tokens and cache writes/reads, so a
lower bound, not a bill)._

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
  - Docs: a deployment security checklist (static-host headers incl. `frame-ancestors`, cache
    policy, forwarded-header/proxy trust, rate-limiter topology, required config keys); kept local
    with the deployment kit since 2026-09-28.
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
