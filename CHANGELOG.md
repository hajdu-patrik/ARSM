# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/);
dates are ISO 8601. Every entry ends with a development-time / cost metrics line - see
`CLAUDE.md` -> Changelog & Development Metrics for how it's measured.

---

## [Unreleased]

### Changed
- Scheduler intake customer lookup: with the License plate filter active, the results list shows vehicles instead of
  customers, one row per matching vehicle (plate with the match highlighted, brand and model, owner name) under a
  "<n> matching vehicles" title; Select picks the owner customer and preselects the vehicle of the chosen row, and the
  view after selection is unchanged. The Customer name results are unchanged. The five-per-page paging is shared by
  both lists.
  _Dev time: ~15 min wall-clock. ~$0.28-0.41 (all sonnet, output-token-only estimate, a lower bound, not a bill)._

### Added
- Known defects of the audit fixed and test gaps closed (2026-10-30).
  - A sole mechanic refused on self-delete gets a dedicated toast (`toast.profileDeleteSoleMechanic`) instead of the generic failure.
  - The registration 400 no longer leaks the framework suffix ` (Parameter '...')` (`RegistrationRefusedException`).
  - `profileService` calls `/api/profile` with no trailing slash, and a failed logout leaves no unhandled rejection (`authService.logout` logs it).
  - New xUnit coverage: the login, refresh and picture upload 429 limits, the refresh replay of a revoked token and the SSE connection cap; the gaps that
    need a real second admin or a non-mechanic token stay recorded in `tests/CLAUDE.md`.
  - _Dev time: ~1h 20m wall-clock. ~$27 (2,676,279 output tokens, all on sonnet; output-token-only estimate, a lower bound)._
- Test coverage audit of every layer (2026-10-30), with a new regression-proof rule in the agent chain.
  - Every layer was compared with the code branch by branch: xUnit grew from 241 to 1258 tests, the new stdlib `tests/Scripts` suite has 466
    tests (run by the pre-push backend stage and the `dotnet.yml` repo gate), the HTTP suite runs 2293 requests, and the E2E suite has 625 tests.
    `GET /api/profile/picture/updates` got its first test.
  - The SQL suite could never fail (its checks only returned rows); all 26 files now raise an error on a violation.
  - 34 redundant or obsolete test files were deleted or merged; `tests/CLAUDE.md` records what covers their behaviour.
  - Fixed, each proven by a test that fails on the old code: numeric enum text accepted as a quote or appointment status, line kind, status
    filter and object storage provider (shared `Validation/DefinedEnum`, also on registration); a quantity rounding to 0.00 answered 500;
    non-ASCII digits passed the company tax number and postal code; a blank customer middle name stored as an empty string; a sole mechanic's
    self-delete orphaned the appointment and stopped the next API start (now 422); the WebUI showed the too-short message for a missing special
    character and no toast on a repeated intake refusal; in the scripts `validate.py` missed `!shadow-*` and arbitrary shadows, the sanitizer
    left bearer tokens readable, a BOM lost the first secret, and a deleted spec broke `select-e2e-specs.py --run`.
  - `arsm-chain`: a `test` work package area, `bugsFound` on every agent, a regression test per self-found defect before the suites, a `unit`
    gate, and a `tests-failed` end state; the rule also binds direct work (root `CLAUDE.md`, Regression Proof).
  - _Dev time: ~2h 47m wall-clock. ~$24 (2,401,599 output tokens, all on sonnet; output-token-only estimate of the chain run, a lower bound that excludes input tokens, cache and the follow-up E2E fix agent)._
- Error alerts, persistent DataProtection keys and session-revocation persistence (2026-10-29), the pentest follow-ups.
  - Two log-based alert rules, `arsm-api-errors` (severity 1, `fail:`/`crit:`) and `arsm-api-warnings` (severity 3,
    `warn:`): stateless, one mail per 5-minute window with the count and the first lines, no resolve mail; the existing
    5xx and restart alerts are unchanged. The warning rule skips client-caused and harmless categories (login and
    request rejections, the 401/403 audit, the startup https-port notice, EF query hints), so it mails only real
    infrastructure trouble (none in the last 30 days apart from the DataProtection warnings this change removes).
  - The DataProtection key ring is persisted: Azure uses the blob container `dataprotection-keys` plus a new Key Vault key
    through the API managed identity (least-privilege roles), dev a gitignored AppHost folder, teszt a Docker volume. The
    application name is fixed to `arsm`, so payloads protected earlier are invalidated once. `deploy-azure.py check` now
    always checks the `Microsoft.KeyVault` provider.
  - Session revocation cutoffs are persisted (`people.TokensValidAfter`, migration `AddPeopleTokensValidAfter`) and
    warmed at startup with a configurable timeout (`SessionRevocation:WarmupTimeoutSeconds`); the per-person reservation
    is atomic and the database update is conditional and monotonic.
  - Gate: the global failure window is gone, only the per-client limit remains. Teszt kit: the RustFS console is disabled
    and its CORS setting removed. The WebUI splash honours `prefers-reduced-motion` (static logo, same 2.5 s).
    `deploy/CLAUDE.md` now says agents run Azure steps only with the owner's explicit permission in that same message.
  - `main.bicep` stays under the 500-line limit: the Key Vault, key, key container and their role assignments live in
    `dataprotection.bicep`, the PostgreSQL server and its chained children in `postgres.bicep` (same resource names and
    ids, compiled resources unchanged); the log alert rules skip query validation, so a fresh workspace deploys.
  - The teszt kit updates itself on every push: after each deploy `deploy.py` syncs its own copy and the gate files
    (`gate.mjs`, `gate-page.mjs`, `gate-style.mjs`, `gate-assets/`) from the deployed commit and restarts only the kit's
    gate process when gate code changed; `run.cmd`, `teszt.ps1`, `setup.ps1` and `kit.psd1` are only reported in
    `deploy.log` for a manual update. A new `arsm-tunnel-rustfs` always starts with the console off.
  - Security notes: the profile-picture SSE fan-out to all staff is intended (no personal data in the payload); hreflang
    is not applicable (single-URL, login-gated SPA with a stored language toggle). No code change for either.

_Dev time: ~53m wall-clock (2026-10-29 10:23 to 11:16 +01:00, one arsm-chain run stopped on open questions, finished with direct opus agents: follow-ups, docs, review, fixes). Cost: ~$1.4-2.7 output-token-only estimate for the arsm-chain run (136k output tokens, sonnet and opus routed; excludes input tokens and cache, so a lower bound); the follow-up agents are not measured._

- Edit-vehicle button in the Scheduler appointment detail modal's vehicle section (2026-10-28). It navigates to
  `/customers?vehicleId=<id>`, which the Customers page consumes once (`useRequestedVehicleEdit`) to open the vehicle
  editor; the label key moved to `common.actions.editVehicle`. The button is shown for every status, cancelled and
  completed included, and an unknown id opens nothing. E2E spec: `appointment-vehicle-link.spec.ts` (full suite 219/219).

_Dev time: ~24m wall-clock (2026-10-28 16:22 to 16:46 +01:00, one arsm-chain run with one sonnet package, finished by hand: a missing comma fixed, gate, full E2E). Cost: ~$6.4-12.8 output-token-only estimate (640k output tokens, sonnet package and reviews, opus routing; excludes input tokens and cache, so a lower bound)._

### Fixed
- `follow-redirects` 1.16.1 to 1.16.2 for the high advisory GHSA-mrwp-f3q8-3g9p (2026-10-31), lock file only. The fix was younger than
  the 7-day `min-release-age` guard, so the owner approved a one-off `--min-release-age=0` for this package; `.npmrc` is unchanged.
  - _Dev time: ~25m wall-clock. cost: not measured._
- `arsm-chain` silently skipped the `ui-ux-style-profile` audit when an implementer reported absolute paths (2026-10-31).
  `normPath` now strips the repository root, which the baseline step reads from `git rev-parse --show-toplevel`, so the audit,
  package ownership, failure routing and the cleanup's deliverable list all see repository-relative paths. A skipped review now
  logs its reason, and a frontend package's skipped audit is also reported as `auditSkipped` in the run result. A proof test file
  reported with backslashes now selects its suite too; before, the suite that had to prove the fix did not run. `tests/Scripts`
  covers this by running the real workflow script under Node with stubbed agents.
  - _Dev time: ~10m wall-clock. cost: not measured._
- Azure deployments failed at random with `ServerIsBusy` (2026-10-28). `main.bicep` wrote the PostgreSQL server's
  children (`azure.extensions`, the `AllowAzureServices` firewall rule, `AutoServiceDb`) in parallel, and a Flexible Server
  takes one write at a time; they now run in a `dependsOn` chain (`az bicep build` clean). The guide's Operations section
  says how to recover when the server itself is busy.

_Dev time: ~13m wall-clock (2026-10-28 18:05 to 18:18 +01:00, from the failed release to this entry). Cost: not measured (direct work, no workflow)._

- Profile picture upload showed the 500 page in production (2026-10-28). The crop dialog's `react-easy-crop` injected its
  stylesheet through `innerHTML`, which the production Trusted Types policy refuses; the `TypeError` reached the
  ErrorBoundary, so no request was ever sent (nothing in the server logs) and the dev server, which has no CSP, never
  showed it. The cropper now runs with `disableAutomaticStylesInjection` and its stylesheet is imported in `index.css`.
  Regression test: the Trusted Types spec opens the crop dialog under the production policy (it failed before the fix).
  E2E 220/220.

_Dev time: ~21m wall-clock (2026-10-28 17:16 to 17:37 +01:00, root cause from the prod logs and a reproduction). Cost: not measured (direct work, no workflow)._

- Phone layout pass from on-device screenshots of teszt.arsm.hu (2026-10-27). The end of every page was unreachable:
  the app shell listed `h-screen h-dvh`, Tailwind emits `.h-screen` later, so it was 100vh, which on a phone excludes the
  browser toolbar, and the toolbar never hides because only `<main>` scrolls; the shell is now
  `h-screen supports-[height:100dvh]:h-dvh`. Lists split into one-item pages on a phone (1/22 customers), so
  `useFittingPageSize` returns a fixed 10 below `sm`. The inline repair history scrolled in a nested 30rem box with a hidden
  scrollbar, which looked cut off; below `sm` it now grows with the page. The quote editor body fills the dialog instead of
  a fixed `60vh`. Touch sizes: the scheduler month filters and mechanic select are 44 px below `lg`, the mechanic roster
  actions 44x44, the header language/theme toggles 44x44 below `sm`. Row titles centre on their 44 px actions in the
  `DataList` tiles; the quote tile puts its actions on the status-badge line so the title keeps one line; the customer card
  keeps edit/delete on the name line. Company result month and VAT values get one labelled line each below `sm`; the
  expertise tiles fill their rows without breaking a word; a disabled primary CTA is neutral and readable in dark mode.
  Company results: months that have not started yet are disabled tiles (`isFutureMonth`), a year step onto one falls back
  to the whole year, and the month picker gained a divider and tile frames. Verified: `tsc -b`, eslint, build, the affected
  E2E specs (company results, lists and pagination, customers, quotes, scheduler, admin, settings), Playwright phone
  screenshots at 393 and 320 px, and the user's own phone on teszt.

_Dev time: ~1h40m wall-clock (2026-10-27 18:13 to 19:53 +01:00, measured from the first screenshot upload to this entry). Cost: not measured (direct work, no workflow)._

- Browser-autofilled inputs follow the theme (2026-10-25). Before, the autofill fill was frozen by a `9999s` background
  transition, because the UA `!important` autofill colour beats author `!important`. So a field autofilled in one theme kept
  that theme's fill after a switch: a light field with light text in dark mode, a dark field with dark text in light mode.
  `styles/autofill.css` now clips the UA fill to the glyphs (`background-clip: text`) and paints the text with
  `--ui-text`. The card behind the field shows through, and it has the same colour as `--ui-input` in both themes; every
  autofillable field sits on a card or a modal. Dark mode adds `color-scheme: dark` for the glyph-edge tint. Verified with
  real Edge autofill (CDP) on `/login`: field pixels match the card in light, dark and after a toggle each way; validate
  passes.

_Dev time: ~6m wall-clock (2026-10-25 15:16 to 15:22 +01:00, one arsm-chain run that kept the fix unverified, then the Edge runtime check by hand; the fix itself was drafted in an earlier, unmeasured session). Cost: ~$0.08 output-token-only estimate for the workflow (7.6k output tokens, sonnet only; excludes input tokens, cache and the hand-run check, so a lower bound)._

### Added
- Transactional e-mail via Resend (2026-10-23). The API gets an `Email/` layer: `IEmailSender` with a `ResendEmailSender`
  (plain `HttpClient` POST to the Resend REST API, 15 s timeout, 429/5xx classified retryable, CR/LF-safe subject and a
  single-address recipient check, the key never logged) and a `LoggingNoOpEmailSender` chosen when `Email:ResendApiKey` is blank
  (dev without a key, CI, unit tests). One branded base template (table layout, inline styles, the logo as an inline CID
  attachment because arsm.hu is token-gated, hex colours copied from the WebUI tokens, Hungarian block first then a short
  English block, footer from the company profile and the reply-to address, plain-text twin, every value HTML-escaped). Three
  mails: moving a quote to Sent e-mails the customer the quote PDF with number, vehicle, gross total and validity, and the
  status is stored only after Resend accepted the message (409 `quote_customer_email_missing` / `quote_email_failed` keep the
  quote as it was; the Quotes page toasts both and the success); the admin password reset e-mails the temporary password and
  the login link and answers 200 `{emailSent, email}` instead of 204, the reset is never rolled back and the Admin page shows
  "sent to" or "hand it over manually"; mechanic registration dispatches a fire-and-forget welcome mail in its own DI scope.
  Configuration: root `.env` keys `ARSM_RESEND_API_KEY`, `ARSM_MAIL_FROM`, `ARSM_MAIL_REPLY_TO` (placeholders in
  `.env.example`); the AppHost reads them from the root `.env` and passes `Email__*` plus `Email__PublicUrl` from
  `WebUi:SiteUrl`; the Azure kit carries them as Bicep params (secret `resend-api-key`), required and validated by the deploy
  script. DNS on Cloudflare: Resend domain verified (eu-west-1), Email Routing `info@arsm.hu`, DMARC. Tests: 101 xUnit cases
  (sanitizer, sender with a fake handler, settings resolver, layout, builders, the three mailers with a fake sender; no
  network), the password-reset HTTP suite and Python check expect the 200 body. Verified: validate, 126/126 unit tests, the
  full Playwright suite; api-suites run by the pre-push gate.

_Dev time: ~55m wall-clock (2026-10-23 12:25 to 13:20 +02:00, including the Resend and Cloudflare setup; one arsm-chain run
with a fable plan and eight sonnet packages that stopped at two routine questions, then the five remaining packages, four
reviews and docs-sync run by hand on the same routed models). Cost: ~$1.6-7.8 output-token-only estimate for the chain
(155k output tokens, sonnet packages, fable plan; excludes input tokens and cache, so a lower bound); the hand-run
continuation is not measured._

- Appointment-to-quote link and status-aware due date (2026-10-23). The Scheduler detail modal shows an "Open quote" button beside
  the due date, and the Customers history appointment modal shows the same action beside "Open in scheduler"; both open the
  appointment's newest quote in the Quotes editor (`/quotes?quoteId=<id>`, consumed once like the create parameters), and neither
  renders the button when the appointment has no quote. `GET /api/quotes` takes an optional `appointmentId` filter for this (the
  shared `useAppointmentQuoteLink` hook; the `QuoteListItemDto` shape is unchanged). The due-date label is status-aware: a
  Completed appointment shows "Befejezve" / "Completed" in the success tone and a Cancelled one "Lemondva" / "Cancelled" in the
  error tone, never an overdue text; open appointments keep the overdue/remaining time (`toneTextClasses` gained `success`).
  Company profile write-back (Development only): after `PUT /api/admin/company-profile` the API rewrites the seven
  `ARSM_COMPANY_*` lines of the repository `.env` and the `CompanyProfile` values of `appsettings.Local.json`, line-wise and
  byte-identical elsewhere (line endings and a missing trailing newline kept); the paths come from
  `CompanyProfile__WriteBack__EnvFilePath` and `...__LocalSettingsPath`, which the AppHost sets from its own directory, an unset
  path or missing file is skipped and Production writes nothing. The seed direction is unchanged: the files feed the table only
  while it is empty, so a hand edit never reaches the database after the first start. Tests: 14 xUnit cases for the two rewriters,
  the `quotes-appointment-filter.http` suite (filter alone, with `status`, an appointment without a quote, a non-numeric id) and the
  `appointment-quote-link.spec.ts` E2E spec (both modals, the completed/cancelled/overdue labels). Verified: validate, the full
  Playwright suite, api-suites (1172/1172 HTTP requests, the six Python checks, 24/24 SQL suites).

_Dev time: ~33m wall-clock (2026-10-23 12:19 to 12:52 +02:00, one arsm-chain run with five sonnet packages and a fable plan, plus the hand-run suite re-run, gate and review). Cost: ~$1.0-5.2 output-token-only estimate (104k output tokens, sonnet packages and reviews, fable plan; excludes input tokens and cache, so a lower bound)._

### Security
- Pentest fixes (2026-10-28), from a read-only audit (seven parallel reviews plus a non-destructive probe of teszt.arsm.hu)
  that found no critical or high issue. Open redirect: the `/500` page's `?returnTo=` accepted `/\evil.com`, which the
  browser resolves cross-origin; `ServerError` now resolves the target against the own origin and refuses any other origin
  (E2E `error-routes-edge`). Customer create/update and the scheduler intake customer answer a 400 field error instead of a
  500 when a name (50), email (150) or phone (20) would overflow its column (HTTP `field-length-validation`,
  `intake-validation-new-customer`). Paged lists clamp `page` to `ListQueryLimits.MaxPage`, so `?page=2147483647` no longer
  overflows the offset into a 500. The appointment, customer and vehicle route groups require `MechanicOnly` like quotes and
  the catalog (unit `MechanicOnlyRouteGroupsTests`). Access tokens are accepted only with HS256 (`JwtValidationParameters`),
  and the API's HSTS is 365 days with `includeSubDomains`, no preload (`HstsConfiguration`). Login: a locked-out account now
  answers the uniform 401 `invalid_credentials` (the lockout is no longer observable), and every login POST needs an allowed
  `Origin` (login CSRF). Registration and the admin password reset, which send mail, share `StaffEmailSends` (5 per minute
  per person). `robots.txt` disallows everything (every route is noindex), and the WebUI build fails without
  `VITE_SITE_URL`, so the static `og:image` can never ship a literal placeholder.
  Blob Storage without an account key: the Azure API reaches the profile-picture container with
  its user-assigned managed identity (`ManagedIdentityCredential`, settings `ObjectStorage:ServiceUrl` and
  `ObjectStorage:ManagedIdentityClientId`; `ObjectStorage:ConnectionString` is no longer read), which `main.bicep` grants
  Storage Blob Data Contributor on the picture container only; the `blob-connection` secret is gone, so no storage account key
  is in any app secret (the S3/RustFS path is unchanged). Rate limits: `GET /api/quotes/{id}/pdf` and `GET /api/company-results`
  allow 30 requests per minute per person (`QuotePdfRenders`, `CompanyResultReports`), and moving a quote to `Sent` 20 per hour
  per person (`QuoteSendRateLimiter`, the permit taken right before the PDF render and the mail); every such rejection is a
  bodiless 429, and Development allows 300 per one-minute window (unit tests `RateLimitPoliciesTests`). Database least
  privilege on Azure (finding 9): the API no longer connects as the server administrator. The Container Apps Job
  `arsm-migrate` (`deploy/azure/migration-job.bicep`) runs the API image with `--migrate-database` as the administrator: it
  migrates, then creates or updates the login role `arsm_app` in one transaction with only `CONNECT`, schema `USAGE`, table DML
  and sequence use (default privileges included), the password passed only as a bound parameter and never logged. The API
  connects as `arsm_app` and skips the startup migration (`Database__MigrateOnStartup=false`; local, CI and test stacks keep
  migrating at startup). `deploy-azure.py infra` deploys everything but the apps, runs the job and waits for it (a failure or
  the 1200 s timeout leaves the apps untouched), then deploys the full template; the new root `.env` key
  `ARSM_POSTGRES_APP_PASSWORD` (bicep `postgresAppPassword`) is required, secret and must differ from
  `ARSM_POSTGRES_PASSWORD` (unit tests `AppRoleProvisioningSqlTests`).

_Dev time: ~2h38m wall-clock (2026-10-28 11:34 to 14:12 +01:00, one arsm-chain run with ten packages finished by hand in a clean worktree: gate, 164 unit tests, E2E, HTTP 1306/1306, SQL 24/24). Cost: ~$5.4-10.9 output-token-only estimate (543k output tokens, sonnet packages and an opus plan, database package, reviews and fixes; excludes input tokens and cache, so a lower bound; the audit itself is not measured)._

- Audit fixes (2026-10-21 to 2026-10-22). Sessions: the token denylist is warmed into memory at startup (no database read per
  authenticated request), a per-person session cutoff ends every access token at once after an admin delete, an admin password
  reset, a self password change (the other sessions) or a self profile delete, and closes the person's SSE streams; refresh
  tolerates a replay inside a 30 s window (the same browser's parallel tab, 204 and nothing rotated) and the WebUI refreshes
  one tab at a time through the Web Locks API; refresh refuses a locked-out identity; the hourly cleanup removes every expired
  refresh row. `POST /api/profile/change-password` and `DELETE /api/profile` count wrong passwords toward the Identity lockout
  (429 `lockout_active` like login) and are limited 5/min per person, the picture upload 10/min per person; the picture decode
  guard drops from 50 to 20 megapixels (the WebUI check matches) behind a two-slot semaphore. Admin password reset:
  `POST /api/admin/mechanics/{id}/password-reset` sets a temporary password, logs the actor and forces a change at the next
  login (every other request answers 403 `password_change_required`; the WebUI keeps the account on the new `/change-password`
  page, HU/EN). Data: `DELETE /api/customers/{id}` and `DELETE /api/vehicles/{id}` are admin-only with an audit line (the cascade
  takes quotes with it; the WebUI shows the delete actions to admins only); Part, LaborType and Appointment edits carry an xmin
  version like quotes (422 without, 409 `<entity>_version_conflict` with a stale one; the WebUI toasts, reloads and retries);
  `people.PhoneNumber` gets a filtered unique index (migration `AddPhoneIndexPasswordResetAndRowVersions`, which also nulls
  later duplicates) and a concurrent profile conflict is 409 instead of 500; the quote lists project on the server instead of
  loading People rows. Platform: `EnableRetryOnFailure` with every explicit transaction as a retriable unit, a 64 KB Kestrel
  body limit (the picture upload keeps 4 MB + 64 KB), `Cache-Control: no-store` on `/api` JSON, Nginx timeouts and body limits
  per location (1 h only for the SSE streams, 5 MB only for the upload), the Npgsql pool capped at 20 on Azure, and in
  the Azure kit a Log Analytics daily cap, two alert rules (5xx, restarts) mailed to `ARSM_ALERT_EMAIL` and, opt-in with
  `ARSM_MONTHLY_BUDGET` above 0 in a module of its own (Azure for Students does not support budgets, so the default is none),
  a monthly budget with 50/80/100 % mails; `deploy-azure.py check` validates the three keys and warns about an unregistered
  `Microsoft.Insights` or `Microsoft.Consumption` provider. WebUI: the scheduler derives today from the month reads and
  polls every 10 minutes while the SSE stream is open; a skip link, a named navigation, the app shell inert behind dialogs
  and an axe sweep over every route (`@axe-core/playwright`). Tests: an xUnit project for the pricing calculators and the session cutoffs (`tests/AutoService.UnitTests`,
  run by `dotnet test`), HTTP suites for the reset, the lockout, the concurrency and the admin-only deletes, Python checks for the
  session revocation and the refresh replay window, and SQL contracts for the new index, column and xmin mappings. Not changed
  (owner decisions, see the report): the refresh token's client-address binding, TOTP, the Blob managed identity, the
  least-privilege database role and the firewall rule (documented in `deployment-azure.md`), the PostgreSQL major version
  (Azure 17, local and CI 18.6).

_Dev time: ~14h53m wall-clock (2026-10-21 22:27 to 2026-10-22 13:20 +02:00, across three sessions: one orchestrated run with three sonnet-worker-max packages plus the backend, review, docs and gate passes by hand, then a review by three sonnet-worker-max reviewers, the follow-up fixes, the full pre-push gate and the full Playwright suite). Cost: not measured._

### Changed
- Company results period picker without dropdowns (2026-10-26). The year is a `‹ 2026 ›` stepper over the same six years
  (previous disabled at the oldest, next at the current year, the value announced politely); below it a "Whole year" tile and
  the 12 months as short localized tiles (`formatMonthShort`, full name as label) on a tinted segmented track, 4x3 on phones and
  6x2 from `sm`, side by side with the stepper from `lg`. Toggle buttons with `aria-pressed`, like the login mode switch; the
  selection, URL state and data fetching are unchanged. Shared: `navIconButtonClass` (the calendar month nav moved here),
  `getSegmentedTileClass`, `segmentedTrackClass`; new `companyResults.previousYear`/`nextYear` keys. The E2E specs drive the
  new controls through `support/company-results-period.ts`. No overflow at 320/390/1300px in either theme; validate and the full
  Playwright suite pass.

_Dev time: ~15m wall-clock (2026-10-26 13:35 to 13:50 +01:00, one arsm-chain run, a hand fix for the tile track after the screenshot check, the full E2E suite). Cost: ~$4.79-$9.59 output-token-only estimate (479k output tokens, sonnet to opus; excludes input tokens and cache, so a lower bound)._

- Phone readability round (2026-10-26). Credential and identity fields (login identifier and password, change password, admin
  register, settings e-mail/phone, delete-profile confirmation) reserve room on the right for the icon browsers and password
  managers inject: `credentialInputClass` (`pr-10`) and, beside an eye button, `credentialToggleInputClass` (button plus icon);
  a long e-mail scrolls inside the field instead of running under the icon. Readability fixes at the cause: light-theme
  success/warning text darkened to reach WCAG AA on the pale washes, delete confirmations wrap long unbroken names, calendar
  day numbers and weekday headers keep their normal size at 320px, the Inventory tabs fit the longer label, a few badge/timestamp
  rows wrap cleanly. A sweep at 320/360/390px (HU light, EN dark, every page plus the intake modal) finds no clipped text, no
  element past the viewport and no unintended overlap; validate and the full Playwright suite pass.

_Dev time: ~39m wall-clock (2026-10-26 12:34 to 13:13 +01:00, one arsm-chain run, then the hand-run 320/360/390px sweep and the full E2E suite). Cost: ~$4.44-$8.87 output-token-only estimate (444k output tokens, sonnet to opus; excludes input tokens and cache, so a lower bound)._

- Phone-optimized WebUI down to 320px (2026-10-26). Admin mechanic cards: the temporary-password and delete buttons are
  32px icon buttons side by side in the top-right corner, the e-mail truncates with a tooltip. Scheduler month filters (sort,
  show all, status chips, mechanic select) are compact 28px controls at every width (`Dropdown` size `compactSlim`). New intake:
  the due date shows only with the task section, directly below the task description; the initial-status label no longer runs
  into its badge. Quote and catalog tiles: every value right-aligned, plate/part number and gross bold, labels stay left. Below
  350px the row icon actions drop to their own right-aligned line (`compactRowHeaderClass`, `DataList` tile `headerEnd`), with
  the Quotes (278 px) and Inventory (220 px) tile pitch estimates measured at 320px. Below `sm` every field renders 16px text so
  iOS Safari does not zoom on focus. Every `Modal`, the auth pages, the error pages and the mobile sidebar drawer scroll instead
  of clipping on short phones; the quote editor keeps its footer pinned; main CTA buttons grow instead of clipping long labels.
  A 320px sweep (both themes, every signed-in page and the intake modal) shows no horizontal overflow; validate and the full
  Playwright suite pass.

_Dev time: ~1h44m wall-clock (2026-10-26 10:01 to 11:45 +01:00, two arsm-chain runs that stopped on questions before the gate, the decisions, a hand-run 320px screenshot sweep and fixes, the full E2E suite). Cost: ~$3.92-$7.84 output-token-only estimate (392k output tokens, sonnet to opus; excludes input tokens and cache, so a lower bound)._

- Self-explaining browser storage names (2026-10-26). Every localStorage, sessionStorage and Cache Storage name follows
  `arsm.<area>.<purpose>` (`arsm.pref.theme`, `arsm.auth.sessionHint`, `arsm.queryCache.private`, `arsm.errorPage.images.v1`, ...),
  so the DevTools Application tab shows what each entry stores and why. All names live in the new
  `src/utils/browserStorageKeys.ts` (constants mirror the key, e.g. `PREF_THEME_KEY`); `app/AutoService.WebUI/CLAUDE.md` has the
  store/key/content/purpose table. The auth cookies are now `__Host-arsm-access-token`, `__Host-arsm-refresh-token` and
  `__Host-arsm-csrf-token` (every user signs in once after deploy); `ClearSessionCookies` also deletes the legacy
  `__Host-autoservice_*` cookies. `legacyStorageMigration.ts` runs first at start-up: it copies each legacy key to its new name
  when that is absent and removes the legacy key, deletes the old image timestamps and image cache; `index.html` and the teszt
  gate page fall back to the legacy theme/language keys, so the first load shows no theme flash. `safeStorage` gains a guarded
  `listStorageKeys`. The E2E specs, HTTP suites and `http_check_support.py` follow the new cookie names. Validate, the HTTP and
  SQL suites and the full Playwright suite pass.

_Dev time: ~34m wall-clock (2026-10-26 09:52 to 10:26 +01:00, two arsm-chain runs, a hand-fixed typo and the test runs). Cost: ~$1.05 output-token-only estimate (105k output tokens, sonnet only; excludes input tokens and cache, so a lower bound)._

- Customers: the whole vehicle tile selects the vehicle (2026-10-23). A click or Enter/Space anywhere on a vehicle tile,
  outside its quote, edit and delete buttons, shows that vehicle's repair history on the right, and a second one returns to the
  customer history; the Eye button is gone from the row. The tile uses the Scheduler `AppointmentCard` full-surface overlay
  button (no nested interactive elements), a faint accent wash on hover and a stronger one when selected (no outline), and the
  inset focus outline, now the shared `insetFocusVisibleOutlineClass`. New `customer-vehicle-tile.spec.ts` (mouse, keyboard,
  edit does not select, 320px). Verified: validate, the full Playwright suite (214/214), screenshots at 1280 and 320 px in both themes.
_Dev time: ~12m wall-clock (2026-10-23 17:31 to 17:43 +02:00, direct work). Cost: not measured._
- Appointment and quote lifecycle rules (2026-10-23). An appointment may be in progress without a quote, but it completes only
  from InProgress with an Accepted linked quote (409 `appointment_completion_requires_in_progress` /
  `appointment_completion_requires_accepted_quote`); Completed is terminal and cannot be deleted (409
  `appointment_completed_terminal`), and its quotes stay viewable and printable for the books but never editable or deletable.
  A Cancelled appointment's quotes are read-only and deletable in any status; once an in-progress appointment has an Accepted
  quote, all of its quotes lock and no new quote links to it (409 `quote_locked_appointment_completed` / `_cancelled` /
  `_accepted` on header, line, status, validity and linked create). Deleting an appointment now deletes its quotes (FK
  `SET NULL` to `CASCADE`, migration `QuoteAppointmentCascade`, no data migrated); deleting a quote never touches the
  appointment. One rule source, `Lifecycle/AppointmentQuoteLifecycle`, feeds new DTO flags (`hasAcceptedQuote`, `canComplete`,
  `canDelete`, `canLinkQuote` on appointments; `isLocked`, `lockReason`, `canDelete` on quotes). WebUI: Completed is a disabled
  status option with an in-progress hint until a quote is accepted, a Completed appointment has no status control or delete,
  the appointment delete confirmation warns about its quotes, the quote editor shows a reason-specific locked notice with
  close/PDF (delete only when allowed), the row delete button follows `canDelete` with the reason in its accessible name, and
  the quote delete confirmation no longer claims that only a draft can be deleted. New HTTP suites (`appointment-lifecycle`,
  `quote-appointment-lock`, `-accepted-lock`, `-delete-matrix`, the cascade in `appointment-delete`), SQL section 34 (FK
  delete rule), E2E specs `scheduler-lifecycle-rules` and `quote-appointment-lock`; existing suites that completed an
  appointment now accept a quote first on a disposable customer.

_Dev time: ~50m wall-clock (2026-10-23 16:10 to 17:00 +02:00, one arsm-chain run with a fable plan, sonnet packages and
reviews and opus hand-offs, then the open questions, the skipped reviews, docs-sync, gate, HTTP/SQL suites and the selected
E2E specs by hand). Cost: ~$3.4-16.9 output-token-only estimate (338k workflow output tokens, sonnet to fable pricing; excludes
input tokens, cache and the hand-run review agents, so a lower bound)._

- Clean-code pass, behaviour unchanged (2026-10-22): about 1,346 fewer lines over 357 files (+405 and -1,751); no route, status code,
  JSON body or rendered text changed and the EF migrations are untouched. Backend: 18 redundant usings, the unused `year` parameter of
  `LoadMonthsAsync` and two PDF model fields nobody read (`QuoteDocumentLine.VatAmount`, `QuoteDocumentModel.IsExpired`) removed, plus
  about 140 comments that only repeated a name or signature (16 long ones shortened); every why, trap and invariant comment stays.
  WebUI: one `ServerErrorBody` type with `extractServerFieldErrors` instead of nine declarations of the same shape, three pass-through
  files gone (`pages/Settings/types.ts`, `pages/Settings/helpers.ts`, the intake barrel), about 35 exports that only their own module
  used narrowed, the unused design tokens, the `.mobile-logo` rule, the `common.sort` keys (HU and EN) and the duplicate button-style
  aliases removed (the built CSS differs by two dead rules only), and about 600 restating comments dropped. Tests: the E2E specs share
  `signInWithMocks`, `recordGetRequests` and `getTokenLikeStorageKeys` instead of private copies, the four Python HTTP checks share one
  rotating login (`sign_in_with_available_login`, `CheckSkipped`) and a failing check now always prints its report, and eight `.http`
  variables no request read are gone. Docs: both READMEs say C# 14 and describe `docs`, the new `deploy/CLAUDE.md` holds the kit's
  invariants (registered with `docs-sync`), the Azure guide lost the `.env.example` block that duplicated the tracked file. Verified: the
  full pre-push gate (validate, backend build and tests, EF pending-model check, WebUI audit, typecheck, lint, build, diff-selected E2E,
  api-suites with 1158/1158 HTTP requests, the six Python checks and 24/24 SQL suites) and the full Playwright suite (195 tests).

_Dev time: ~1h23m wall-clock (2026-10-22 22:00 to 23:23 +02:00, direct work: analyzer, knip, clone and comment scans, the cleanup commits, the full gate and the full Playwright suite). Cost: not measured._
- Internal refactor, behaviour unchanged (2026-10-21): about 1600 fewer lines. Backend: one `ApiProblem` factory, `PersonIdClaim`,
  `DateTimeNormalization.ToUtc`, `ServerSentEventStream.ServeAsync`, `IdentityResultExtensions.ToValidationErrors`, a shared
  `CatalogItemHandlers` base for parts and labour types, `VehicleInput` / `CustomerInput`, shared mechanic assign / unassign cores,
  quote `SaveWithVersionAsync` / `IncludeDetails`, and `UpdateProfileAsync` split into per-field resolvers (routes, status codes,
  JSON bodies, check order and the EF model unchanged). WebUI: one `ConfirmModal` for 17 dialogs, one generic
  `useCatalogItemMutations` with per-kind config, shared server-validation, rejected-save, profile-picture and read-failure helpers,
  one `ToolbarSearchField`, and the memo export boilerplate removed (texts, test ids and markup unchanged). Verified: the full
  pre-push gate (validate, backend build, EF pending-model check, WebUI audit, typecheck, lint, build), the api-suites (1084/1084 HTTP
  requests, 24/24 SQL) and the full E2E suite (164 tests), plus an independent Codex review of the backend diff and a final
  two-reviewer Claude pass over the merged diff (backend and WebUI, report-only), whose leftovers (six dead usings, one name, three
  comments, one unused export) went into two follow-up commits.

_Dev time: ~5h15m wall-clock across two parallel agents plus the final review and gate pass (2026-10-21 16:50 to 22:02 +02:00, including an interrupted session). Cost: not measured._

### Added
- Local test instance switch (2026-10-20): `deploy/local-test/teszt.ps1 on|off|status` turns the `teszt.arsm.hu` kit on or
  off persistently and shows its state; it reads the kit definition from `deploy/local-test/kit.psd1` (tasks, containers in
  start order, health checks) and is identical to the owner's MaKoncert test kit. `off` disables the three tasks, kills
  the kit's process trees by command line, stops the containers and sets their restart policy to `no`, so nothing starts
  again until `on`, which restores `unless-stopped`, enables and starts everything and waits for the health checks. The gate
  and the tunnel now run under `deploy/local-test/run.cmd` (restart with 3-60 s backoff, `logs\<service>.log` with 20 MB
  rotation; cloudflared logs there instead of `--logfile`), the deploy task runs `python.exe deploy.py` under
  `conhost --headless` with the MaKoncert deploy task's settings, and `setup-tunnel.ps1` is renamed to `setup.ps1`
  (registers the tasks disabled, ends with `teszt.ps1 on`, or `off` with `-Off`). `deploy/gate/gate.mjs` skips its own
  log file with `GATE_LOG_FILE=off`. `.gitattributes` keeps `deploy/local-test/*.cmd` CRLF; the kit README and
  `deployment-local-test.md` describe the switch.

_Dev time: ~31m wall-clock (2026-10-20 14:30 to 15:01 +02:00, direct work). Cost: not measured._
- Local test instance kit and guide (2026-10-20): the `teszt.arsm.hu` kit is tracked without secrets in
  `deploy/local-test/`: `deploy.py` (auto-deploy of green-CI `main`, now locating the repository through `ARSM_REPO` or
  its own location), `setup-tunnel.ps1` (registers the tasks in the Task Scheduler folder `\Automations\` as
  `ARSM teszt - Deploy`, `- Gate` and `- Tunnel` with descriptions, removes the old-named ones, passes `GATE_ENV_FILE`
  to the gate through `node --env-file`), placeholder `*.example` templates and a folder `.gitignore` for the real
  secret and state files. `deploy/docs/deployment-local-test.md` covers how it works, turning it on and off, backups and
  restore and first-time setup; both READMEs, the Azure guide and `CLAUDE.md` link it. The instance is off since
  2026-10-20 (production is `arsm.hu` on Azure). `deploy/gate/gate.mjs` takes over the kit gate's SHA-256 constant-time
  token comparison (no length leak) and its `logs/gate.log` rotation at 256 KiB (not used with `GATE_MODE=azure`).

_Dev time: ~16m wall-clock (2026-10-20 13:17 to 13:34 +02:00, direct work). Cost: not measured._
- Company profile in the database (2026-10-18): the quote letterhead data now lives in the single-row `companyprofiles` table
  (`CK_CompanyProfiles_SingleRow`), seeded once from the `CompanyProfile` configuration when empty and read by the quote PDF.
  Admins read and replace it through `GET`/`PUT /api/admin/company-profile` (`CompanyProfileDto`, field-keyed 400 validation,
  CSRF like other mutating calls); migration `AddCompanyProfile` creates the table without inserting a row. Settings gains an
  Admin-only "Company data" section (HU/EN) with the same rules client-side: all seven fields required, tax number
  `12345678-1-12`, 4-digit postal code, phone and e-mail as on the profile, name and address up to 150 characters.

_Dev time: ~33m wall-clock (2026-10-18 20:03 to 20:36 +02:00, two arsm-chain runs plus hand-run gate and docs-sync). Cost: ~$1.7-3.4 output-token-only estimate (168k output tokens, sonnet and one opus plan; excludes input tokens and cache, so a lower bound)._
- Azure production kit (2026-10-16): the deploy kit under `deploy/` is now tracked (only the local security checklist
  and deploy plan stay ignored). `registry.bicep` creates an Azure Container Registry (Basic, admin user disabled) and
  `main.bicep` pulls from it with a user-assigned managed identity (AcrPull). The web app runs the token gate
  (`deploy/gate/`, `GATE_MODE=azure`) as a sidecar in front of Nginx with the client IP chain kept end to end; the API
  gets the bootstrap admin from the `ARSM_PROD_ADMIN_*` keys and the demo-seed parameters are gone. Scaling is hybrid for
  the student credit: the API stays on (`ARSM_API_ALWAYS_ON`, default true), the web app scales to zero
  (`ARSM_WEB_ALWAYS_ON`, default false); the prod gate page uses neutral "ARSM" wording.
  `python scripts/deploy-azure.py` (`check`, `registry`, `images`, `infra`, `dns`, `bind-domain`, `release`) reads the
  root `.env`, builds from a clean `git archive` of a chosen commit and deploys; `deployment-azure.md` is rewritten
  (arsm.hu on Azure, teszt.arsm.hu stays the Cloudflare tunnel view). `deploy/github/publish-images.yml` is removed.

_Dev time: ~18m wall-clock (2026-10-16 11:27 to 11:45 +02:00, one arsm-chain run plus hand-run review, docs-sync and gate). Cost: ~$1.2 output-token-only estimate (124k output tokens, sonnet only; excludes input tokens and cache, so a lower bound)._
- Mandatory pre-push gate (2026-10-14): `python scripts/pre-push.py` (helpers in `scripts/prepush/`) runs from the
  tracked `.githooks/pre-push` hook (`git config core.hooksPath .githooks`) and mirrors CI: `validate.py --all
  --security`, the dotnet restore/build/test/EF gate, the frontend audit/tsc/lint/build/spec-compile/audit steps,
  the diff-selected E2E specs, and the HTTP + SQL suites on a throwaway `arsm-prepush-postgres` + `arsm-prepush-s3`
  stack with the developer's local secrets, removed afterwards.

### Changed
- CI hardening (2026-10-14): both workflows run with `permissions: contents: read`; `dotnet.yml` builds on
  `ubuntu-latest` only, cancels superseded runs and gains a `repo-gate` job (`validate.py --all --skip-build`);
  `setup-dotnet` caches NuGet by the lock files. `.actrc` maps only `ubuntu-latest`.
- Intake endpoint split (2026-10-14): `AppointmentEndpoints.Intake.cs` (a 400-line type span, over the 300-line
  limit the new repo gate enforces) is split into the handler plus `IntakeCustomer`/`IntakeVehicle` partials with
  the same checks, order and messages; the unused `AddDefaultTokenProviders()` Identity registration is removed.

_Dev time: ~29m wall-clock (2026-10-14 23:34 to 2026-10-15 00:03 +02:00, one arsm-chain run, the intake split and two full pre-push gate runs). Cost: ~$2.2 output-token-only estimate (220k output tokens, sonnet only; excludes input tokens and cache, so a lower bound)._
- Dependency updates (2026-10-15): Azure.Storage.Blobs, libphonenumber-csharp, AWSSDK.S3, react-i18next,
  @vitejs/plugin-react, vite 8.3.4 and postcss patch bumps; the Aspire SDK and both hosting packages move to 13.6.1
  together with every AppHost lock file (default and per-RID) regenerated. `@babel/core` stays on 7.x. Also ASP.NET
  Core (JwtBearer, Identity.EntityFrameworkCore, OpenApi) and EF Core Design/Tools 10.0.13, Http.Resilience and
  ServiceDiscovery 10.11.0, Scalar.AspNetCore 2.18.0, react-easy-crop, @playwright/test 1.64, libphonenumber-js,
  lucide-react and typescript-eslint. Dependency updates now run only on request, with no update bot.

### Fixed
- Azure first release (2026-10-17 to 2026-10-18): the Container Apps environment is created on API 2026-07-01 with
  `environmentMode: 'WorkloadProfiles'` (older API versions now get an Express environment with no static IP, custom
  domain or `allowInsecure`); Nginx reaches the API at its internal FQDN because its resolver ignores the search
  domains; `infra` passes the issued managed certificate to the Bicep so a release keeps the `arsm.hu` binding; the
  prod admin may reuse the dev admin login (user decision). The deploy doc notes the per-region PostgreSQL restriction.

_Dev time: ~1h wall-clock of fixes (2026-10-17 18:30 to 18:40 and 2026-10-18 19:50 to 20:15 +02:00), plus waits on Azure and DNS. Cost: not measured._
- MessagePack advisory (2026-10-17): the AppHost pins `MessagePack` 2.5.307 over the 2.5.302 that Aspire 13.6.1
  pulls in transitively (GHSA-qhrr-8q5h-9q3h, moderate); all four AppHost lock files are regenerated.

_Dev time: ~5m wall-clock (2026-10-17 17:04 to 17:09 +02:00). Cost: not measured._
- Pre-push ports (2026-10-15): the gate's throwaway PostgreSQL, RustFS and API moved to their own ports (15432,
  19000, 15200), below the Windows dynamic range where an outbound socket had taken the old 59000, and off the dev
  API's 5200, so the gate no longer needs the Aspire stack stopped.
- Cold E2E start (2026-10-15): a Playwright `globalSetup` loads every app route once before the specs, because a
  fresh `npm ci` left the Vite dev server so cold that the first spec of each worker timed out in the pre-push gate.

_Dev time: ~3h wall-clock (2026-10-15 10:36 to 13:30 +02:00, mostly gate runs). Cost: not measured._

### Removed
- Local deploy plan and security checklist (2026-10-18): with prod live, the gitignored
  `deploy/docs/arsm-deploy-plan.html` and `deployment-security-checklist.md` are deleted and dropped from `.gitignore`;
  the comments and the Azure deploy doc that cited checklist sections now state the rule itself.

_Dev time: ~5m wall-clock. Cost: not measured._
- Quick-tunnel docs (2026-10-14): the "Temporary Public Test Link" (random trycloudflare.com URL) section is gone
  from README.md and README(HU).md; its Requirements and the first-admin Accounts step now live in the fixed
  named-tunnel section, which is the only documented way to share a test instance.

_Dev time: ~2m wall-clock (2026-10-14 23:08 to 23:09 +02:00, one arsm-chain run plus a restored step). Cost: ~$0.85 output-token-only estimate (85k output tokens, sonnet only; excludes input tokens and cache, so a lower bound)._

### Changed
- Splash and list loading (2026-10-12): the splash keeps its 2500 ms minimum only on the very first load in a
  browser (localStorage flag `arsm-splash-shown`); later loads and new tabs keep 250 ms. The Customers, Inventory
  and Quotes lists measure their page size before the first request (`useFittingPageSize` is `null` until
  known, the query stays disabled until then), so each page entry sends one request, a blank search is omitted
  from the params and an unmeasurable list falls back to the minimum page size. New spec
  `list-single-request.spec.ts` covers the one-request-per-entry rule.

_Dev time: ~51m wall-clock (2026-10-12 20:52 to 21:43 +02:00, two arsm-chain runs plus the measurements). Cost: ~$22.6 output-token-only estimate (2.26M output tokens, sonnet only; excludes input tokens and cache, so a lower bound)._

### Added
- Fixed public test hostname docs (2026-10-14): README.md and README(HU).md gain a "Fixed Public Test Hostname
  (Cloudflare Named Tunnel)" section - domain onto Cloudflare, `cloudflared tunnel
  login` with one origin cert per zone, named tunnel + DNS route, ingress config, a single WebUI build for the
  fixed URL, windowless logon autostart, and a Limits table. Placeholders only; no code changes.

_Dev time: ~3m wall-clock (2026-10-14 21:58 to 22:01 +02:00, one arsm-chain run). Cost: ~$0.65 output-token-only estimate (65k output tokens, sonnet only; excludes input tokens and cache, so a lower bound)._

- No demo data (2026-10-12): the API seeds nothing anymore. `Data/DatabaseInitializer.EnsureDatabaseReadyAsync`
  replaces the demo initializer and only migrates, clears the legacy backfill rows, checks appointment integrity
  and normalizes data; the `DemoData` configuration is gone, so a fresh database holds no accounts or records and
  the first admin comes from the `Bootstrap:Admin` configuration. The HTTP suite provisions its own idempotent
  fixtures in `tests/API/_setup/ensure-test-fixtures.http` (customers, vehicles, catalog items, an anchor quote),
  the SQL checks run on any data set, and CI starts the API with a per-run bootstrap admin.

_Dev time: ~3h wall-clock (2026-10-12 17:00 to 20:02 +02:00, including the dev database reload and the mini-prod
auto-deploy set-up outside the repository). cost: not measured._

- List, search and dropdown polish (2026-10-12): one change set across API and WebUI.
  - VAT rates: parts, labor types and quote line snapshots accept only 5, 18 and 27 percent; 0 is rejected
    for new writes with the existing `InvalidVatRate` response. Stored rows keep their value; no migration.
  - Search: the leading magnifier icon stays visible while focused and typing, and every search result and
    suggestion list colors the matching text in the primary purple (text color only, no background, no bold).
  - Server-side pagination: customers, a customer's vehicles, parts, labor types, quotes and the admin
    mechanic list take `page`, `pageSize` and `search` and return `PagedResult` (`items`, `totalCount`,
    `page`, `pageSize`); the old `limit` parameter is gone from these endpoints. The WebUI shows as many
    rows as fit the visible height with previous/next arrows and a page indicator; the admin mechanic list
    uses a fixed page size of 5.
  - Scheduler intake: customer-name suggestions show 5 at a time with arrows; the name and license plate
    filters are mutually exclusive, with an informational note beside the disabled one.
  - Dropdowns: one shared accessible dropdown (combobox/listbox semantics, keyboard navigation, closes on
    outside click and Escape) replaces every native select.
  - 404: the page renders immediately, without a loading spinner.
  - Splash: the first full load in a browser tab keeps the splash for at least 2500 ms (per-tab
    sessionStorage flag); later reloads in the same tab keep the 250 ms minimum.
  - Sorting: the customers, inventory and admin mechanic lists lose their ascending/descending toggle and the
    API takes no `sortDirection`; every list is shown in ascending order.
  - OpenAPI: the paged endpoints document `page`, `pageSize` and `search`.
  - Quotes: `GET /api/quotes` takes `expired=true|false` (a Sent quote past its validity), so the Expired and
    Sent chips page and count exactly on the server; the list stays newest first.
  - Accessibility: an open dropdown list is named by its field's visible label.
  - Search highlight uses the vivid accent text pair (`text-arsm-accent-vivid dark:text-arsm-accent`), readable in both themes.

_Dev time: ~2h27m wall-clock (2026-10-12 14:22 to 16:49 +02:00, two arsm-chain runs plus direct fixes, the
HTTP and E2E runs and a before/after visual check). Cost: ~$0.49-$19.69 output-token-only estimate (984k output tokens across both runs, haiku to
opus pricing; excludes input tokens and cache, so a lower bound)._

- First-admin bootstrap (2026-10-11): an empty database outside the demo seed had no way to get an Admin.
  When a `Bootstrap:Admin` section is configured, startup (after migrations) creates one Mechanic with a
  confirmed Identity account and the Admin role, in a single transaction under a PostgreSQL advisory lock
  that re-checks for an existing admin, so concurrent instances create at most one. The mechanic
  registration rules (`ContactNormalization`, name and length checks, the Identity password policy) apply.
  It does nothing once any Admin exists, never touches an existing account, and logs invalid configuration
  or any failure without secrets; the API always starts. `Data/AdminBootstrapSettings`, `Data/AdminBootstrapInitializer`.

_Dev time: ~40m wall-clock (2026-10-11 ~21:48 to 22:28 +02:00, including the temporary tunnel instance and
the runtime checks on a throwaway stack). cost: not measured._

### Changed
- Dependency upgrade run (2026-10-11, `dependency-upgrade` skill): stable releases at least 7 days old, each
  web-checked for advisories, supply-chain incidents and breaking changes before it was applied.
  - WebUI: `lucide-react` 1.51.0 -> 1.52.0.
  - Backend: `AWSSDK.S3` 4.0.103 -> 4.0.104.1, `Azure.Storage.Blobs` 12.29.2 -> 12.30.0 (adds the transitive
    `Apache.Arrow` 22.1.0), `libphonenumber-csharp` 9.0.38 -> 9.0.40, `QuestPDF` 2026.9.0 -> 2026.9.1,
    `Scalar.AspNetCore` 2.17.3 -> 2.17.13; ServiceDefaults OpenTelemetry 1.18.0 -> 1.19.1 (OTLP exporter,
    hosting) and 1.19.0 (ASP.NET Core, HTTP and runtime instrumentation).
  - Containers and CI: PostgreSQL 18.3 -> 18.6 (minor: fixes 28 CVEs, no dump/reload; the 18.6 GIN
    `reltuples` post-update check is clean) and RustFS 1.0.0 -> 1.0.1, in `AppHost.cs` and `tests.yml`;
    the `api-http-sql` job runs Python 3.14 instead of 3.13.
  - DB health check: `AutoServiceDbContext` is now `Data/DatabaseHealthCheck` instead of `AddDbContextCheck`.
    It runs the same `CanConnect` probe but lets cancellation propagate, so a `/health` request aborted by
    its caller no longer logs `Unhealthy` ("The operation was canceled", seen at AppHost start while a
    cold connection was still opening); a 5 s registration timeout keeps the check below the AppHost's
    10 s probe, and a refused, timed-out or hung database still reports `Unhealthy`.
  - Image processing: `SixLabors.ImageSharp` 3.1.12 (five advisories published 2026-10-07, three high,
    fixed only in 4.1.2, which needs a paid Six Labors licence for Release builds) is replaced by the MIT
    `SkiaSharp` 4.153.1 plus `SkiaSharp.NativeAssets.Linux.NoDependencies` 4.153.1 for the Linux container;
    the five ImageSharp advisories are gone. `Imaging/SkiaProfilePictureProcessor` replaces
    `ImageSharpProfilePictureProcessor` with the same contract: the 50-megapixel header check before
    decoding, EXIF orientation, a 512x512 bound without upscaling, lossy WebP at quality 80, the SHA-256
    ETag and the same 422 messages (plus `Image could not be encoded.` if the native encoder returns
    nothing). The unused `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore`
    package is removed.
  - Waiting (younger than 7 days): Aspire 13.6.1 (AppHost SDK, hosting packages, `aspire.cli`;
    2026-10-07), Playwright 1.64.0, Python 3.15.0 and a batch of npm/NuGet patches. Deferred: `@babel/core`
    8 (the React Compiler constraint) and the local Azure Bicep `postgresVersion` 17 (a major version).
  - Verification: validate gate passes every stage, security included (no ImageSharp advisories left);
    `dotnet build -c Release` passes; E2E 112/112 (full suite); HTTP suite 876/876 plus the 4 Python checks
    (re-run after the SkiaSharp swap) and SQL 24/24 on the AppHost with PostgreSQL 18.6 and RustFS 1.0.1; a throwaway harness reproduced the
    old `Unhealthy` on an aborted probe and showed the new check propagating it instead, while a refused,
    blackholed or silent database still reports `Unhealthy`.

_Dev time: ~1h08m wall-clock (2026-10-11 20:02 to 21:11 +02:00). Upgrade and health check done directly
(cost: not measured); the SkiaSharp swap ran through arsm-chain: ~$3.17-$6.34, output-token-only estimate
(317k output tokens, sonnet to opus; excludes input tokens and cache writes/reads)._

- AI workflow: models are routed, not pinned (user decision, 2026-10-11, replaces the 2026-09-27 policy).
  Haiku and fable are valid again; the main session follows the `[router]` line whatever it names, and
  inside `arsm-chain` the `orchestrator` calls the trirouter (`mcp__trirouter__route_prompt`) for every work
  package (implement, review, fix) and shared step (review, gate, test, fix). The plan schema carries
  `{model, effort}` for each, the workflow passes them to every `agent()` call (only a proven model/effort start
  rejection is retried on the fallback; every other error propagates), `args.route` (the `[router]` header's
  `model=`/`effort=`) gives the planner its own route, and the difficulty-1
  single-area path makes one routing-only orchestrator call. Only a missing or invalid router field falls
  back, per field, to the previous values (plan and review opus high, implement and fix sonnet max, gate
  sonnet low, test sonnet medium); the return value's `models` lists each route with its source and every call's actually used model. CLAUDE.md,
  the orchestrator agent, the reminder hook and both READMEs are updated.
- New project skill `dependency-upgrade`: upgrades the WebUI npm packages, NuGet packages and tools, Aspire,
  the .NET SDK, Node, Docker images, GitHub Actions, Playwright and Python/CLI tooling to the latest
  stable releases (at least 7 days old, major versions included), web-checks each package for advisories
  and supply-chain incidents first, and hands breakage to `arsm-chain`.
  The companion trirouter change (separate repository) allows Haiku, labels Fable as the most expensive
  deep model, routes trivial work to haiku workers, resolves the in-session tier to `sonnet` for workflow
  steps and adds `model=`/`effort=` to the `[router]` header.

_Dev time: ~16h19m wall-clock (2026-10-10 23:26 to 2026-10-11 15:45 +02:00, overlapping the overnight WebUI
workflow runs). cost: not measured._

- WebUI polish from the frontend benchmark report (2026-10-10 to 2026-10-11): its 48 proposals, with no
  new feature, page or system, and the rendered UI unchanged except for the approved items below.
  - Cookies: `__Host-autoservice_at`, `__Host-autoservice_rt` and `__Host-autoservice_csrf` replace the
    unprefixed names, so a browser only keeps them when they are `Secure`, `Path=/` and carry no
    `Domain`. `SameSite=Strict`, the `HttpOnly` split (the CSRF cookie stays script-readable), the
    lifetimes, the `X-CSRF-Token` header and the double-submit rule are unchanged. Old-name cookies
    are not migrated, so everyone logs in once again; no schema change, no migration.
  - Deletions (logout, profile deletion) now send `Secure`, `Path=/` and `SameSite=Strict` for all
    three cookies, because a browser ignores the expiry of a `__Host-` cookie without them.
  - HTTP suite: a new check proves an authenticated `DELETE` without `X-CSRF-Token` is refused with
    `403 csrf_token_invalid` and removes nothing; every suite file reads the prefixed cookie names.
  - Toolchain: TypeScript 7 side by side with the TypeScript 6 API that `typescript-eslint` needs
    (`tsc` 7.0.2 comes from `@typescript/native`), React Router 8 without `react-router-dom`, and a
    WebUI `.npmrc` (`min-release-age=7`, `ignore-scripts=true`). eslint runs `strictTypeChecked`,
    `jsx-a11y` and `react-hooks`; the app and E2E projects set `noUncheckedIndexedAccess` and
    `exactOptionalPropertyTypes`; `validate.py` also rejects `ring-*`. The unused
    `i18next-browser-languagedetector` dependency is removed.
  - Shared utilities: `safeStorage` (never throws), `intlFormat` (memoized `Intl` objects, en-GB and
    24-hour date presets), `devLog` (production logs only the error name), `fieldA11y`, and
    `filterNameSearchInput` (names may hold spaces and apostrophes in search fields only).
  - Shared building blocks: one `FieldErrorText` component (`components/common`) renders every inline
    field error (Login, Settings, Admin registration, Customers, the Inventory catalog form and the
    Quotes editor), and one `useReadFailureToast` hook (`src/hooks`) toasts a failing read once per
    failure episode (Customers, Quotes, Scheduler, Settings profile, Admin roster): silent while it
    keeps failing, re-armed only by a successful load. The unused `monoIdentifierWrapTextClass` is
    removed.
  - Tokens and focus: dark mode is a CSS-variable swap (25 `ui-*` colours replace most `dark:` pairs),
    radius and type scales with an 11 px floor, and keyboard focus is a 2 px outline (#6e53ad, #a98fe0
    in dark) instead of the box-shadow ring. Form fields get a 3:1 border (#8b7cc0) that turns to the
    focus colour on focus, the neutral compact chip uses that field border too, the crop zoom slider
    has a focus outline, the light status badges meet AA contrast, and Inter is self-hosted.
  - Wording: HU uses one name per concept (Árajánlat, Katalógus, Munkadíjtípus, Időpont, Kiküldött and
    the adjective statuses, ÁFA) and the polite form; EN follows en-GB spelling (Labour) without word swaps, uses
    Log in and Log out as verbs and ends sentences with a full stop. Counted texts have
    `_one`/`_other` plurals, dates read DD/MM/YYYY (EN) or `YYYY. MM. DD.` (HU) on a 24-hour clock,
    and only the active locale loads at start-up (the language switch is async).
  - Data: page reads are declarative `useQuery` factories instead of copies in state and request-id
    guards; only the part and labor-type catalog is persisted in sessionStorage (24 h, per person);
    logout also clears the scheduler view, the toasts (`clearToasts`) and the error-artwork cache
    (`clearErrorIllustrationCache`, which is warmed when the browser is idle); quote changes refresh
    the company results, and deleting a vehicle or customer refreshes the Quotes and Company results
    reads, because the API deletes their quotes with them. The sidebar profile reads the shared
    profile query. axios times out after 30 s, 502/503/504 go to the error page like 500, a session
    check that hits a timeout or a 5xx no longer logs the user out, and the live stream reconnects
    with exponential backoff and jitter.
  - Accessibility: the dialog traps Tab, takes the initial focus, hands it back to the opener, closes
    on Escape (only the topmost one does) and is named by its title; validated fields carry
    `aria-invalid` and `aria-describedby`; the Inventory tabs are ARIA tabs; the sidebar toggles
    expose `aria-expanded` and `aria-controls`; `DataList` renders each row once (table semantics in
    the table layout, list semantics in the tiles); toasts live in one persistent polite live region,
    and error toasts last 10 s, pause on hover and focus, wrap and are announced as alerts.
  - Controls: the language button names the language it switches to, the theme toggle shows a sun or
    a moon, the theme follows the system colour scheme until one is picked (a pre-paint script applies
    it and preloads the white logo only in the dark theme), and the login submit is always enabled,
    validates on submit and focuses the first invalid field, with the mode switch above the fields.
  - Splash: it stays until the session is restored and the translations are ready, for at least 250
    ms and no longer a fixed 3 s, now also on `/quotes`, `/inventory` and `/company-results`; one
    route table feeds the router, the guards, the sidebar, SEO and the splash, and the lazy-route
    fallback is a centered spinner.
  - Uploads: a profile picture is checked by type, magic bytes and header size (8192 px per side, 25
    megapixels) before it is decoded.
  - Build and CSP: `base-uri 'none'`, `manifest-src 'self'`, `upgrade-insecure-requests` and Trusted
    Types (`require-trusted-types-for 'script'; trusted-types 'none'`); a `vendor-query` chunk, a gzip
    budget warning per chunk and `.gz` precompression for nginx `gzip_static`; the per-route JSON-LD block
    is removed, because Trusted Types block its script and every route is noindex; `index.html` and the
    manifest declare `lang` hu (`og:locale` hu_HU, en_GB in English); the phone number library loads when the phone login is chosen, and
    the icon shrank from 152 KB to 26 KB.
  - E2E: the specs follow the single-DOM list hooks, ARIA tabs, wording and toasts. New specs cover
    the splash (also with reduced motion), Trusted Types on every route (the policy is added as a
    header, because the dev server sends no CSP) and the Hungarian vocabulary; the Playwright config
    pins the light colour scheme.

_Dev time: ~17h41m wall-clock (2026-10-10 21:21 to 2026-10-11 15:02 +02:00, including the research and the
overnight workflow runs). ~$162-$324, output-token-only estimate (16.2M output tokens over five arsm-chain runs,
sonnet to opus; excludes input tokens, cache writes/reads and the research agents)._

- Aspire 13.6.0 for the AppHost (2026-10-04): `Aspire.AppHost.Sdk`, `Aspire.Hosting.JavaScript` and
  `Aspire.Hosting.PostgreSQL` 13.5.3 -> 13.6.0, with all four lock files regenerated (win-x64 default
  plus the linux-x64, osx-arm64 and osx-x64 ones the CI runners restore in locked mode); the local
  `aspire.cli` tool follows to 13.6.0.

_Dev time: ~5m wall-clock. cost: not measured._

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
- WebUI build: the CSP hash of the inline `/login` script is computed over LF-normalized text, as
  the browser does; a Windows (CRLF) checkout produced a mismatching hash, so a local production
  build blocked the script (2026-10-04). CI and Docker builds (LF) were not affected.

_Dev time: ~10m wall-clock. cost: not measured._

- WebUI: a full load of any route (most visible on the 404 and 500 pages, which show no splash)
  flashed the logo twice, full size, before the page (2026-10-04). index.html's static `/login`
  shell was hidden only by the Tailwind `hidden` class, and in dev the CSS arrives with the JS;
  it now carries the native `hidden` attribute and is revealed only once the stylesheet applies.
  Verified frame by frame in dev and in a production build (shell still revealed on `/login`, no
  CSP violation); E2E 72/72.

_Dev time: ~12m wall-clock. cost: not measured._

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
