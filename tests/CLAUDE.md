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

## Secrets Policy

- Never hardcode credentials, hosts, or connection strings.
- `.secrets` for Playwright plus the read-only `ARSM_MCP_POSTGRES_CONNECTION_STRING` used by the sql suite; `tests/.env` for HTTP. Templates: `.secrets.example` and `tests/.env.example`.
- HTTP cookie-auth mutation suites use `ARSM_TEST_WEBUI_ORIGIN` for the allowed `Origin` header.
- Keep tracked MCP SQL templates (`.claude/.mcp.template.json`, `.vscode/mcp.template.json`, `.env.example`) placeholder-based; local gitignored `.claude/.mcp.json`, `.vscode/mcp.json`, and `.env` must hold the concrete read-only PostgreSQL URI for `ai_agent_test_user` on developer machines.

## Canonical Runner Contract

- Use `python scripts/run-local-test-suite.py [all|playwright|http|sql]`.
- Runner child commands default to a 300-second timeout; use `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` only for slower local runs.
- Playwright runs with 3 workers by default (`PLAYWRIGHT_WORKERS` overrides it). For a change, prefer
  `python scripts/select-e2e-specs.py --run`: it runs only the specs the diff affects through the runner
  and falls back to the full suite for any shared file.
- Use `tests/.artifacts/test-suite-summary.json` as sanitized AI-readable source.
- Never publish raw `.env`, `.secrets`, tokens, cookies, absolute paths, or unsanitized logs.

## Coverage Anchors

- VIN/kW/drivetrain contract (no HP/torque fields).
- Customer search/list + scheduler lookup (email/plate/name).
- Profile picture GET cache headers, ETag conditional `304`, and auth/cookie `Vary` behavior.
- Profile picture upload contract: JPEG/PNG/WebP in, always `image/webp` out, 4 MB cap, 422 on magic-byte or decode failure. Image fixtures must be structurally valid (correct chunk CRCs), because the API decodes and re-encodes every upload.
- `people` profile-picture column contract and the legacy-column-removal post-condition check in `tests/Database/core-schema/core-schema-contracts.sql`.
- Catalog schema contracts in `tests/Database/core-schema/pricing-catalog-contracts.sql`: `parts`/`labortypes` `numeric(18,2)` precision, the four named VAT/price-range check constraints, the two unique indexes (`PartNumber`, `Code`), and the `PartNumber`/`Code`/`Name` max-length contract.
- Catalog API coverage in `tests/API/catalog/`: `parts-crud-happy.http`, `parts-validation.http`, `labor-types-crud-happy.http`, `labor-types-validation.http`, and `catalog-authz.http` (all 10 routes under the `MechanicOnly` policy).
- Catalog E2E coverage in `app/AutoService.WebUI/tests/e2e/catalog-parts.spec.ts` and `app/AutoService.WebUI/tests/e2e/catalog-labor-types.spec.ts`: tab switch reflected in the URL, toolbar search and sort, the live gross-price preview on create, reloading the server-returned row after edit, and the duplicate part-number/code conflict.
- `catalog-authz.http` and `quotes-authz.http` both record the same coverage gap instead of a fabricated token: a `MechanicOnly` 403 for an authenticated-but-not-mechanic request cannot be produced against the live API today, because `Customer` records never receive an `IdentityUserId` and registration only accepts `personType: "Mechanic"`. Both files currently prove only authenticated-vs-unauthenticated (401).
- Quote schema contracts in `tests/Database/core-schema/quote-schema-contracts.sql`: `quotes`/`quotelines` numeric(18,2) precision, string-enum storage for `Status`/`LineKind`, the five named check constraints, the five configured indexes, and the no-physical-`xmin`-column post-condition for the `Version` concurrency mapping.
- Quote data-integrity checks in `tests/Database/feature-flow/`: `quote-status-integrity.sql` (a Sent/Accepted/Rejected quote always has `SentAt`), `quote-line-kind-integrity.sql` (`CK_QuoteLines_LineKindIntegrity` Part/Labor exclusivity), and `quote-totals-integrity.sql` (stored `TotalNet`/`TotalVat`/`TotalGross` agree with their lines and with each other).
- Quote API coverage in `tests/API/quotes/`: `quotes-crud-happy.http`, `quotes-validation.http`, `quotes-authz.http` (all 11 routes under the `MechanicOnly` policy), `quote-lines.http`, and `quote-status-transitions.http`.
- Python HTTP checks cover behaviour HTTPYAC cannot express (multipart upload contracts, streaming SSE, a per-quote line cap that only shows up after 200 successful additions, and a binary PDF response whose text has to be read back). They share `tests/API/http_check_support.py` for the cookie-aware client, credentials and assertions; `tests/API/profile/profile_picture_check_support.py` now holds only the profile-picture fixtures and re-exports the shared helpers.
- The runner drives them from `PYTHON_HTTP_CHECKS` in `scripts/run-local-test-suite.py`; each one reports under its own key in the sanitized summary (`profilePictureUploadCheck`, `appointmentUpdatesCheck`, `quoteLineLimitCheck`, `quotePdfCheck`). Add a new check to that tuple rather than copying the invocation.
- `appointment-updates-check.py` asserts the SSE payload keys are camelCase. That contract is easy to break silently, because the payload is serialized by a static `JsonSerializer` call that does not pick up the ASP.NET Core JSON options, and the browser parsers drop anything they cannot read.
- `quote-pdf-check.py` downloads the seeded quote as a PDF and asserts the content type, the quote number in `Content-Disposition`, the `%PDF-` signature, a size floor, 404 for a missing quote and 401 without authentication. It extracts the text with `pypdf` and asserts the accented word `Árajánlat` is in it; that one assertion reports as skipped when `pypdf` is not installed, rather than failing the machine.
- `quote-line-limit-check.py` fills a dedicated draft quote to the 200-line cap (`QuoteValidation.MaxLineCount`), asserts the 201st add is refused with 422, and deletes the fixture afterwards so the demo seed the SQL integrity suite asserts against stays untouched.
- Scheduler intake and customer details/history split-view E2E behavior.
- Company result coverage: `tests/API/reporting/company-results.http` (whole year, single month, default year, empty period answering 200 with zeros, out-of-range year and month, 401 unauthenticated), `tests/Database/feature-flow/company-result-aggregation.sql` (monthly totals add up to the yearly one, accepted quote totals agree with their lines, no sent quote in both the pending and the expired row) and `app/AutoService.WebUI/tests/e2e/company-results.spec.ts` (status rows, the created-month rule, month narrowing, VAT and line-kind breakdown, empty period).
- The company result mock derives the report from the same mock quotes the other specs mutate, so accepting a quote in one step really moves money into the accepted row in the next.
- Quote E2E coverage in `app/AutoService.WebUI/tests/e2e/quote-editor.spec.ts` (list totals, search, draft creation from a vehicle row, catalog part and labor lines, line edit and delete) and `app/AutoService.WebUI/tests/e2e/quote-status.spec.ts` (send gating, the post-send lock, accept/reject, the status filter including the computed expiry, draft deletion).
- The quote mock (`app/AutoService.WebUI/tests/e2e/support/api-mock-quote-*.ts`) recomputes line amounts and totals and bumps the version on every write, so a total asserted in a spec is a server-shaped number, not one the UI derived.
- Quote page-object locators take the visible copy of each row control (`filter({ visible: true })`), because `DataListRow` renders a row's actions twice, once for the desktop cells and once for the mobile tiles, and a container query on the list's own width (not a viewport breakpoint) decides which copy is visible.
- List-alignment E2E coverage in `app/AutoService.WebUI/tests/e2e/list-alignment.spec.ts`: the header and every row share identical column x/width in the Quotes list, both quote-line lists (7 columns for a draft, 6 once the quote can no longer be edited), both Inventory tabs, and the Company results month and VAT lists; every quote row carries the same three actions at the same x (the "+1 icon" regression); the table/tiles container-query switch as the sidebar opens and collapses at a fixed viewport; no horizontal page scroll at 320px; and the locale-formatted fractional quantity (`1,5` hu / `1.5` en). Its helpers are `support/list-alignment.ts` (`expectColumnsAligned`, `expectRowActionsAligned`, `listSection`: every rectangle for a list is read atomically in one browser round trip after `document.fonts.ready`, 1px tolerance) and `support/list-alignment-fixtures.ts` (`seedWorstCaseListData`: a 120-character title, ~100M amounts, every quote status, 40-character part/labor identifiers, and quantities `9999.99` and `1.5`). `quote-editor.spec.ts` now asserts the delete button is present on every row, enabled for a draft and disabled with the draft-only hint otherwise, and the Quotes/Catalog page objects wait on test ids and bilingual accessible names so the same suite runs in hu as well as en. The full sweep covers both languages and both themes and pushes the suite to about 6.5 minutes, past the runner's 300-second default (`ARSM_TEST_COMMAND_TIMEOUT_SECONDS`, see Canonical Runner Contract).
