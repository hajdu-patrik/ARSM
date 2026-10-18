# Tests Rules

## Scope and Ownership

- Primary owner: Zsombor
- Architecture escalation: Patrik
- Scope: `tests/API/**/*.http`, `tests/Database/**/*.sql`, `scripts/run-local-test-suite.py`

## Trigger Gates

- Heavy test work only on explicit request or significant behavior change.
- `http-endpoint-test`: API contract/auth/status/validation changes.
- `sql-database-test`: schema/persistence/integrity changes.
- `e2e-playwright-test`: frontend structural/user-flow changes.
- New feature + triggered test agent: generate missing coverage first.
- Non-behavioral changes: docs-sync only for test-layer docs.

## Core Rules

- Keep tests deterministic, focused, and chunked by scenario.
- Size limits: preferred <= 180 lines, hard split > 250 lines.
- SQL policy: `ai_agent_test_user`, `SELECT` only, no DML/DDL.
- Test agents own create, update, and delete inside their own scope paths; delete only obsolete or relocated coverage, never to make a run pass.
- E2E specs are type-checked through `app/AutoService.WebUI/tsconfig.e2e.json` in the `tsc -b` chain; Playwright itself transpiles with esbuild and never type-checks them.
- The Playwright `globalSetup` (`app/AutoService.WebUI/tests/e2e/support/warm-dev-server.ts`) loads every
  `APP_ROUTE_CHECKS` route once before the specs: after a fresh `npm ci` the cold Vite dev server took over
  10 s per first load and failed the first spec of each worker in the pre-push gate.
- CSRF double-submit pattern (httpyac): every login/refresh/password-change request carries a
  post-response script that exports the `__Host-autoservice_csrf` value from that response's `Set-Cookie`
  header, and every later unsafe request that carries the auth cookie echoes it back as
  `X-CSRF-Token`. Reference snippet - copy verbatim:

  ```
  # @name Login
  POST {{AutoService_ApiService_HostAddress}}/api/auth/login
  Origin: {{WebUI_Origin}}
  Content-Type: application/json
  { "email": "{{SomeEmail}}", "password": "{{SomePassword}}" }

  {{
    exports.CsrfToken = response.headers['set-cookie']?.find(c => c.startsWith('__Host-autoservice_csrf='))?.match(/^__Host-autoservice_csrf=([^;]+)/)?.[1];
  }}

  ?? status == 200

  ###

  ### [...] some later unsafe request that carries the auth cookie
  POST {{AutoService_ApiService_HostAddress}}/api/...
  Origin: {{WebUI_Origin}}
  X-CSRF-Token: {{CsrfToken}}
  ```

  Put the script on every refresh and every re-login as another user, because both rotate the cookie;
  `POST /api/auth/login` itself never sends the header, since login is always CSRF-exempt. Never capture
  the token with a stand-alone `@CsrfToken = {{ ... }}` region: httpyac evaluates request-less regions
  as global variables for every request of the file, so a second definition keeps the stale token or
  fails with a ReferenceError before its source request has run.
- Unauthenticated (401) checks carry `# @no-cookie-jar`, so they never send a session left behind by
  an earlier request or file (the cookie jar is shared across files in one run). A file's opening
  "clear any session cookie left by a previous file" logout cannot know that session's CSRF token, so
  it answers 403 and clears nothing; it is not asserted, and the file's next login replaces the cookies.

## Secrets Policy

- Never hardcode credentials, hosts, or connection strings.
- `.secrets` for Playwright plus the read-only `ARSM_MCP_POSTGRES_CONNECTION_STRING` used by the sql suite; `tests/.env` for HTTP. Templates: `.secrets.example` and `tests/.env.example`.
- HTTP cookie-auth mutation suites use `ARSM_TEST_WEBUI_ORIGIN` for the allowed `Origin` header.
- The CSRF double-submit token (`__Host-autoservice_csrf` cookie / `X-CSRF-Token` header, see Core Rules) is
  always read back from a named login/refresh/password-change response at run time - never hardcoded
  as a literal, and never printed or logged.
- Keep tracked MCP SQL templates (`.claude/.mcp.template.json`, `.vscode/mcp.template.json`, `.env.example`) placeholder-based; local gitignored `.claude/.mcp.json`, `.vscode/mcp.json`, and `.env` must hold the concrete read-only PostgreSQL URI for `ai_agent_test_user` on developer machines.

## Canonical Runner Contract

- Use `python scripts/run-local-test-suite.py [all|playwright|http|sql]`.
- Runner child commands default to a 300-second timeout; use `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` only for slower local runs.
- Playwright runs with 3 workers by default (`PLAYWRIGHT_WORKERS` overrides it). For a change, prefer
  `python scripts/select-e2e-specs.py --run`: it runs only the specs the diff affects through the runner
  and falls back to the full suite for any shared file.
- `python scripts/pre-push.py` (pre-push hook, installed with `git config core.hooksPath .githooks`) runs the HTTP and SQL suites through this runner on a disposable stack; `git push --no-verify` is an exception only.
- Use `tests/.artifacts/test-suite-summary.json` as sanitized AI-readable source.
- Never publish raw `.env`, `.secrets`, tokens, cookies, absolute paths, or unsanitized logs.

## Fixtures (no demo data)

- The API seeds nothing (user decision 2026-10-12): a fresh database holds only the bootstrap admin
  (`Bootstrap__Admin__*`, matched by `ARSM_TEST_ADMIN_EMAIL` / `ARSM_TEST_ADMIN_PASSWORD`), so every
  suite provisions what it reads. `tests/API/_setup/ensure-test-accounts.http` creates the plain mechanic;
  `tests/API/_setup/ensure-test-fixtures.http` creates the shared, idempotent fixtures (every create accepts `409`
  for "already there"): the customer with `ARSM_TEST_CUSTOMER_EMAIL` (phone `+36304445566`) owning
  `ABC-101` (VIN `WVWZZZAUZJW123456`) and `ABC-102`, a second customer (`fixture.second@example.test`) owning `ABC-201`,
  the part `OLF-1001`, the labor type `OLAJCSERE`, and the draft quote titled `ARSM fixture anchor quote` with one
  catalog part line and one catalog labor line (created only while it is missing).
- Shared fixtures are read-only for the suites: address them by email, plate or title (a quote number is generated, never
  a stable key) and never edit or delete them. A file that mutates a customer's vehicle creates its own disposable customer
  and vehicle with run-unique identifiers and deletes them at the end.
- `scripts/run-local-test-suite.py` runs the `_setup` files on their own first, and the Python checks (they read the same fixtures through
  `http_check_support.find_anchor_quote` / `resolve_fixture_customer`) after that. The SQL suite makes no assumption about
  rows or counts, so every file passes on an empty database too.

## Coverage Anchors

- VIN/kW/drivetrain contract (no HP/torque fields).
- Customer search/list + scheduler lookup (email/plate/name).
- Profile picture GET cache headers, ETag conditional `304`, and auth/cookie `Vary` behavior. The
  genuine ETag-match round trip (`304` on the stored ETag, `200` on a mismatched one) is covered by
  `profile-picture-upload-check.py` right after its PNG upload, not by `profile-picture.http` - that
  file never uploads a picture, so it only proves the no-picture-yet and never-304 paths.
- Profile picture upload contract: JPEG/PNG/WebP in, always `image/webp` out, 4 MB cap, 422 on magic-byte or decode failure. Image fixtures must be structurally valid (correct chunk CRCs), because the API decodes and re-encodes every upload.
- CSRF double-submit coverage: `tests/API/auth/csrf-double-submit.http` proves a missing `X-CSRF-Token`
  and a wrong one both answer `403` with body `code: csrf_token_invalid`, an authenticated `DELETE`
  without the header is refused the same way and leaves its disposable catalog part in place, and the
  correct token (read from the login response's `Set-Cookie`, see Core Rules) passes; every unsafe request across
  `tests/API/auth/`, `tests/API/_setup/` and `tests/API/profile/` that carries the auth cookie sends the
  same header. `http_check_support.HttpClient` adds it automatically from the `__Host-autoservice_csrf` cookie
  in its jar on unsafe methods, so the Python checks needed no per-call change.
- `people` profile-picture column contract and the legacy-column-removal post-condition check in `tests/Database/core-schema/core-schema-contracts.sql`.
- Every `tests/API/**/*.http` suite asserts status codes in-file with httpyac `?? status == N`, so the
  runner fails the request on a wrong status; none of them rely on a comment-only expected status
  anymore.
- Catalog schema contracts in `tests/Database/core-schema/pricing-catalog-contracts.sql`: `parts`/`labortypes` `numeric(18,2)` precision, the four named VAT/price-range check constraints, the two unique indexes (`PartNumber`, `Code`), and the `PartNumber`/`Code`/`Name` max-length contract.
- Company profile API coverage in `tests/API/admin/`: `company-profile-happy.http`, `company-profile-validation.http` and `company-profile-authz.http` (`GET`/`PUT /api/admin/company-profile`, Admin only).
- Catalog API coverage in `tests/API/catalog/`: `parts-crud-happy.http`, `parts-validation.http`, `labor-types-crud-happy.http`, `labor-types-validation.http`, and `catalog-authz.http` (all 10 routes under the `MechanicOnly` policy).
- Catalog E2E coverage in `app/AutoService.WebUI/tests/e2e/catalog-parts.spec.ts` and `app/AutoService.WebUI/tests/e2e/catalog-labor-types.spec.ts`: tab switch reflected in the URL, toolbar search, ascending part-number order with no sort toggle, the live gross-price preview on create, reloading the server-returned row after edit, and the duplicate part-number/code conflict.
- Paging E2E coverage: `pagination-catalog-quotes.spec.ts`, `pagination-registry.spec.ts`, `intake-suggestions.spec.ts`, `search-highlight.spec.ts` and `vat-options.spec.ts` (VAT 5/18/27, 27 default, a stored 0% row still listed). Lists are page-sized by `useFittingPageSize`, so catalog and quote specs set a tall viewport or mock a fixed `pageSize`; a failing "fits without scrolling" test points at the `reservedBottomPx` values in `useCatalogState` and `useQuotesListState`. List mocks return `{items, totalCount, page, pageSize}` (`support/api-mock-paging.ts`, default `pageSize` 20, clamped to 500), always ascending; pagination test ids come from `support/pagination.ts`. Selects are `Dropdown` triggers, driven through `support/dropdown.ts`. `list-alignment.spec.ts` opens quotes through search.
- `catalog-authz.http` and `quotes-authz.http` both record the same coverage gap instead of a fabricated token: a `MechanicOnly` 403 for an authenticated-but-not-mechanic request cannot be produced against the live API today, because `Customer` records never receive an `IdentityUserId` and registration only accepts `personType: "Mechanic"`. Both files currently prove only authenticated-vs-unauthenticated (401).
- Quote schema contracts in `tests/Database/core-schema/quote-schema-contracts.sql`: `quotes`/`quotelines` numeric(18,2) precision, string-enum storage for `Status`/`LineKind`, the five named check constraints, the five configured indexes, and the no-physical-`xmin`-column post-condition for the `Version` concurrency mapping.
- Quote data-integrity checks in `tests/Database/feature-flow/`: `quote-status-integrity.sql` (a Sent/Accepted/Rejected quote always has `SentAt`), `quote-line-kind-integrity.sql` (`CK_QuoteLines_LineKindIntegrity` Part/Labor exclusivity), and `quote-totals-integrity.sql` (stored `TotalNet`/`TotalVat`/`TotalGross` agree with their lines and with each other).
- Quote API coverage in `tests/API/quotes/`: `quotes-crud-happy.http`, `quotes-validation.http`, `quotes-authz.http` (all 11 routes under the `MechanicOnly` policy), `quote-lines.http`, `quote-status-transitions.http`, and `quotes-expired-filter.http` (`expired=true|false` keeps or excludes expired quotes, both counts add up to the whole list, `status=Sent&expired=false` is the Sent chip, a non-boolean is 400).
- Python HTTP checks cover behaviour HTTPYAC cannot express (multipart upload contracts, streaming SSE, a per-quote line cap that only shows up after 200 successful additions, and a binary PDF response whose text has to be read back). They share `tests/API/http_check_support.py` for the cookie-aware client, credentials and assertions; `tests/API/profile/profile_picture_check_support.py` now holds only the profile-picture fixtures and re-exports the shared helpers.
- The runner drives them from `PYTHON_HTTP_CHECKS` in `scripts/run-local-test-suite.py`; each one reports under its own key in the sanitized summary (`profilePictureUploadCheck`, `appointmentUpdatesCheck`, `quoteLineLimitCheck`, `quotePdfCheck`). Add a new check to that tuple rather than copying the invocation.
- `appointment-updates-check.py` creates (as the admin, on the fixture customer's first vehicle) and deletes its own appointment, and asserts the SSE payload keys are camelCase. That contract is easy to break silently, because the payload is serialized by a static `JsonSerializer` call that does not pick up the ASP.NET Core JSON options, and the browser parsers drop anything they cannot read.
- `quote-pdf-check.py` downloads the fixture anchor quote as a PDF and asserts the content type, the quote number in `Content-Disposition`, the `%PDF-` signature, a size floor, 404 for a missing quote and 401 without authentication. It extracts the text with `pypdf` and asserts the accented word `Árajánlat` is in it; that one assertion reports as skipped when `pypdf` is not installed, rather than failing the machine.
- `quote-line-limit-check.py` fills a dedicated draft quote on the anchor quote's vehicle to the 200-line cap (`QuoteValidation.MaxLineCount`), asserts the 201st add is refused with 422, and deletes the fixture afterwards so the shared fixtures stay untouched.
- Scheduler intake and customer details/history split-view E2E behavior.
- Company result coverage: `tests/API/reporting/company-results.http` (whole year, single month, default year, empty period answering 200 with zeros, out-of-range year and month, 401 unauthenticated), `tests/Database/feature-flow/company-result-aggregation.sql` (monthly totals add up to the yearly one, accepted quote totals agree with their lines, no sent quote in both the pending and the expired row) and `app/AutoService.WebUI/tests/e2e/company-results.spec.ts` (status rows, the created-month rule, month narrowing, VAT and line-kind breakdown, empty period).
- The company result mock derives the report from the same mock quotes the other specs mutate, so accepting a quote in one step really moves money into the accepted row in the next.
- Quote E2E coverage in `app/AutoService.WebUI/tests/e2e/quote-editor.spec.ts` (list totals, search, draft creation from a vehicle row, catalog part and labor lines, line edit and delete) and `app/AutoService.WebUI/tests/e2e/quote-status.spec.ts` (send gating, the post-send lock, accept/reject, the status filter including the computed expiry, draft deletion).
- The quote mock (`app/AutoService.WebUI/tests/e2e/support/api-mock-quote-*.ts`) recomputes line amounts and totals and bumps the version on every write, so a total asserted in a spec is a server-shaped number, not one the UI derived.
- Quote page-object locators take a row control directly, with no `filter({ visible: true })`: `DataListRow` renders each row once, as a table row or as tiles, and a container query on the list's own width (not a viewport breakpoint) switches between them. The DOM hooks are `data-list-header` (visible in the table layout only), `data-list-cell` with `data-column`, and `data-list-cell-label` (tile layout only).
- List-alignment E2E coverage in `app/AutoService.WebUI/tests/e2e/list-alignment.spec.ts`: the header and every row share identical `data-column` keys and column x/width in the Quotes list, both quote-line lists (7 columns for a draft, 6 once the quote can no longer be edited), both Inventory tabs, and the Company results month and VAT lists; every quote row carries the same three actions at the same x (the "+1 icon" regression); the table/tiles container-query switch as the sidebar opens and collapses at a fixed viewport (header hidden or visible, section role `list` or `table`, and 4 visible `data-list-cell-label` tile labels per quote row against none in the table); no horizontal page scroll at 320px; and the locale-formatted fractional quantity (`1,5` hu / `1.5` en). Its helpers are `support/list-alignment.ts` (`expectColumnsAligned(rows, { expectedColumns })`, `expectRowActionsAligned`, `listSection`: every rectangle for a list is read atomically in one browser round trip after `document.fonts.ready`, 1px tolerance) and `support/list-alignment-fixtures.ts` (`seedWorstCaseListData`: a 120-character title, ~100M amounts, every quote status, 40-character part/labor identifiers, and quantities `9999.99` and `1.5`). `quote-editor.spec.ts` now asserts the delete button is present on every row, enabled for a draft and disabled with the draft-only hint otherwise, and the Quotes/Catalog page objects wait on test ids and bilingual accessible names so the same suite runs in hu as well as en. The full sweep covers both languages and both themes and pushes the suite to about 6.5 minutes, past the runner's 300-second default (`ARSM_TEST_COMMAND_TIMEOUT_SECONDS`, see Canonical Runner Contract).
- Splash E2E coverage in `app/AutoService.WebUI/tests/e2e/splash.spec.ts`: for every app route in `support/app-routes.ts` (login, scheduler, customers, quotes, inventory, company results, settings, admin), with and without `prefers-reduced-motion`, the splash (`#root .arsm-loading-logo-halo`) appears, covers the viewport with a solid background, leaves in under 2 s (not a fixed 3 s) but not before the 150 ms floor of the 250 ms anti-flash minimum, leaves no `#login-shell` copy, and the page underneath answers a real click (theme toggle reachable by pointer). One more test delays `/api/auth/validate` by 1.2 s and asserts the splash stays until the session check answers. `support/splash-trace.ts` records it with a MutationObserver installed before the first paint. A first load in a fresh tab (`primeBrowserState(page, { splashShown: false })`) keeps the splash `FIRST_LOAD_SPLASH_MIN_MS` (about 2500 ms) or more, a reload in the same tab only `REPEAT_LOAD_SPLASH_MIN_MS`; the shared `support/browser-state.ts` seeds the flag by default.
- One-request-per-entry E2E coverage in `list-single-request.spec.ts`: each of the Customers, Quotes and Inventory lists sends exactly one list request on entry, and the rendered row count equals the `pageSize` it sent. A mismatch points at the row-pitch estimates in `useCustomersListState.ts`, `useQuotesListState.ts` and `useCatalogState.ts` (the Customers case at 1280x900 sits near its 976 px width breakpoint).
- Trusted Types E2E coverage in `trusted-types.spec.ts`: `support/trusted-types.ts` adds `Content-Security-Policy: require-trusted-types-for 'script'; trusted-types 'none'` to every document response (the dev server sends no CSP); a control test proves an `innerHTML` string assignment is refused and reported; every route in `support/app-routes.ts` must load with no `securitypolicyviolation` event and no Trusted Types console or page error. Register `enforceTrustedTypes` before `installApiMocks`.
- Behaviour and wording anchors of the 2026-10-11 WebUI polish: `catalog-parts.spec.ts` (arrow-key tab navigation, modal focus trap, Escape and focus return, the Dismiss dialog backdrop), `login-edge.spec.ts` (submit stays enabled, validate-on-submit focus with `aria-invalid`, the 10 s `role=alert` error toast that wraps), `settings-edge.spec.ts` (Sun/Moon theme toggle, language toggle naming the target language, theme following `prefers-color-scheme` until one is picked), en-GB `DD/MM/YYYY, HH:mm` dates asserted under `timezoneId: 'UTC'` (`customer-registry.spec.ts`, `quote-editor.spec.ts`), plurals (`company-results.spec.ts`, `scheduler-intake.spec.ts`), `error-routes-edge.spec.ts` (the signed-in not-found page offers Go to scheduler), and `hu-wording.spec.ts` (the unified Hungarian wording). `playwright.config.ts` pins `colorScheme: 'light'`, so specs that need another scheme set it themselves; `support/toast.ts` holds `toastMessage` and `errorToastMessage`.
