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
- E2E specs are type-checked through `tsconfig.e2e.json` in the `tsc -b` chain; Playwright itself transpiles with esbuild and never type-checks them.

## Secrets Policy

- Never hardcode credentials, hosts, or connection strings.
- `.secrets` for Playwright plus the read-only `ARSM_MCP_POSTGRES_CONNECTION_STRING` used by the sql suite; `tests/.env` for HTTP. Templates: `.secrets.example` and `tests/.env.example`.
- HTTP cookie-auth mutation suites use `ARSM_TEST_WEBUI_ORIGIN` for the allowed `Origin` header.
- Keep tracked MCP SQL templates placeholder-based; local gitignored `.claude/.mcp.json` and `.vscode/mcp.json` must hold the concrete read-only PostgreSQL URI for `ai_agent_test_user` on developer machines.

## Canonical Runner Contract

- Use `python scripts/run-local-test-suite.py [all|playwright|http|sql]`.
- Runner child commands default to a 300-second timeout; use `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` only for slower local runs.
- Use `tests/.artifacts/test-suite-summary.json` as sanitized AI-readable source.
- Never publish raw `.env`, `.secrets`, tokens, cookies, absolute paths, or unsanitized logs.

## Coverage Anchors

- VIN/kW/drivetrain contract (no HP/torque fields).
- Customer search/list + scheduler lookup (email/plate/name).
- Profile picture GET cache headers, ETag conditional `304`, and auth/cookie `Vary` behavior.
- Profile picture upload contract: JPEG/PNG/WebP in, always `image/webp` out, 4 MB cap, 422 on magic-byte or decode failure. Image fixtures must be structurally valid (correct chunk CRCs), because the API decodes and re-encodes every upload.
- `people` profile-picture column contract and the legacy-column-removal post-condition check in `tests/Database/core-schema/core-schema-contracts.sql`.
- Quote schema contracts in `tests/Database/core-schema/quote-schema-contracts.sql`: `quotes`/`quotelines` numeric(18,2) precision, string-enum storage for `Status`/`LineKind`, the five named check constraints, the five configured indexes, and the no-physical-`xmin`-column post-condition for the `Version` concurrency mapping.
- Quote data-integrity checks in `tests/Database/feature-flow/`: `quote-status-integrity.sql` (a Sent/Accepted/Rejected quote always has `SentAt`), `quote-line-kind-integrity.sql` (`CK_QuoteLines_LineKindIntegrity` Part/Labor exclusivity), and `quote-totals-integrity.sql` (stored `TotalNet`/`TotalVat`/`TotalGross` agree with their lines and with each other).
- Quote API coverage in `tests/API/quotes/`: `quotes-crud-happy.http`, `quotes-validation.http`, `quotes-authz.http` (all 11 routes under the `MechanicOnly` policy), `quote-lines.http`, and `quote-status-transitions.http`.
- Python HTTP checks cover behaviour HTTPYAC cannot express (multipart upload contracts, streaming SSE, a per-quote line cap that only shows up after 200 successful additions). They share `tests/API/http_check_support.py` for the cookie-aware client, credentials and assertions; `tests/API/profile/profile_picture_check_support.py` now holds only the profile-picture fixtures and re-exports the shared helpers.
- The runner drives them from `PYTHON_HTTP_CHECKS` in `scripts/run-local-test-suite.py`; each one reports under its own key in the sanitized summary (`profilePictureUploadCheck`, `appointmentUpdatesCheck`, `quoteLineLimitCheck`). Add a new check to that tuple rather than copying the invocation.
- `appointment-updates-check.py` asserts the SSE payload keys are camelCase. That contract is easy to break silently, because the payload is serialized by a static `JsonSerializer` call that does not pick up the ASP.NET Core JSON options, and the browser parsers drop anything they cannot read.
- `quote-line-limit-check.py` fills a dedicated draft quote to the 200-line cap (`QuoteValidation.MaxLineCount`), asserts the 201st add is refused with 422, and deletes the fixture afterwards so the demo seed the SQL integrity suite asserts against stays untouched.
- Scheduler intake and customer details/history split-view E2E behavior.
