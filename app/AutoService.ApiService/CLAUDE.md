# AutoService.ApiService Rules

## Scope and Ownership

- Primary owner: Mark
- Architecture sign-off: Patrik
- Security/testing escalation: Zsombor

## Decision Ownership

- The user owns backend product, architecture, contract, persistence, auth/session, and runtime-composition decisions.
- Do not add or change API behavior, DTO fields, EF schema, auth/session flow, runtime defaults, validation rules, tests, or documentation policy unless explicitly requested, specified by instructions, or agreed in the active plan.
- If backend requirements are ambiguous, ask the user before choosing an approach.

## Hard Invariants

- `People` stays abstract TPH.
- Identity linkage only through `People.IdentityUserId`.
- DTO-only API boundaries (no direct EF entity exposure).
- Config-first addressing; no hardcoded secrets/URLs.

## Contract Anchors

- Vehicle contracts: `Vin`, `EnginePowerKw`, `DrivetrainType` (`Petrol`, `Diesel`, `Hybrid`, `PHEV`, `Electric`).
- Customer list/search keeps `VehicleLicensePlates` exposure.
- Scheduler lookup/intake keeps email, exact plate, name multi-result behavior.

## Auth and Runtime Anchors

- Cookies: `autoservice_at` (10 min), `autoservice_rt` (7 days).
- Unsafe cookie-bearing API mutations require an allowed WebUI `Origin` header.
- Rate limits: login `10/min`, refresh `20/min`; lockout after 5 failed attempts for 15 min.
- In-process auth rate limits/login bans are single-instance only; non-Development deployments must explicitly confirm `Deployment:RateLimiterTopology=SingleInstance` or use a distributed limiter.
- Profile picture GET responses keep private browser caching with ETag revalidation and auth/cookie-aware `Vary` headers; SSE update behavior remains intact.
- Live update channels share `Realtime/`: `UpdateBroadcaster<TEvent>` owns the bounded per-subscriber fan-out and the subscription caps, and `ServerSentEventStream` owns the SSE framing, keep-alive and idle timeout. Payloads serialize as camelCase, because the static `JsonSerializer` call does not pick up the ASP.NET Core JSON options and the browser parsers would drop PascalCased frames.
- Every appointment mutation publishes `AppointmentUpdatedEvent` after its save, so `GET /api/appointments/updates` subscribers see other users' changes without polling. A handler that saves but does not publish is a bug.
- Read-only profile GET/person lookup paths use `AsNoTracking`; profile mutations keep tracked entities.
- Preserve middleware and endpoint mapping order in `Program.cs`.

## Profile Picture Storage Anchors

- Profile pictures live exclusively in S3-compatible object storage (`Storage/`: `IProfilePictureStorage`, `S3ProfilePictureStorage` via `AWSSDK.S3`); the `people.ProfilePicture` bytea column was dropped and `People` keeps only `ProfilePictureObjectKey`, `ProfilePictureETag`, `ProfilePictureContentType`.
- `ObjectStorageSettingsResolver` resolves `ObjectStorage:*` settings, letting `ObjectStorage__*` environment variables win over config; it rejects blank values and template-placeholder markers and fails fast at startup.
- `ObjectStorageBucketInitializer` (hosted service) verifies the bucket at startup and creates it only when `ObjectStorage:AutoCreateBucket` is true.
- `ObjectStorage:DisablePayloadSigning` and `ObjectStorage:DisableDefaultChecksumValidation` are provider compatibility switches, not preferences. MinIO wants the AWSSDK.S3 defaults (`false`); Cloudflare R2 rejects the streaming SigV4 payload signing and the CRC32 checksum that AWSSDK.S3 v4 sends by default, so R2 needs both `true`. Keeping them in config is what makes a provider switch code-free.
- Uploads accept JPEG/PNG/WebP up to 4 MB (`MaxProfilePictureBytes`); the endpoint also enforces `MaxProfilePictureRequestBytes` (upload limit + 64 KB) via `RequestSizeLimitAttribute`/`RequestFormLimitsAttribute` so oversized bodies are rejected before buffering.
- `ImageSharpProfilePictureProcessor` (`Imaging/`) guards a 50-megapixel decode limit, auto-orients, resizes to fit 512x512 without upscaling, and re-encodes to WebP (quality 80) with a SHA-256 ETag; stored objects are always WebP regardless of the accepted upload type.

## Quote Anchors

- 12 endpoints under the `MechanicOnly` policy (`Quotes/QuoteEndpoints.cs`): 10 on `/api/quotes` (list, get, update, delete, add/update/delete line, change status, extend valid-until, pdf) and 2 on `/api/vehicles/{vehicleId}/quotes` (list, create).
- `Domain/Quote.cs` and `Domain/QuoteLine.cs`: `QuoteStatus` (Draft, Sent, Accepted, Rejected) and `QuoteLineKind` (Part, Labor) are string-enum columns. `Expired` is a computed DTO flag (`Status == Sent && ValidUntil < now`), never a stored value.
- Optimistic concurrency: `Quote.Version` maps to the Postgres `xmin` system column via `IsRowVersion()`, not a real column. Every write mutation requires the client-submitted version; DELETE takes it as a `?version=` query parameter. A stale version returns 409 with body `{"code":"quote_version_conflict"}`; a missing (zero) version returns 422.
- `Validation/QuoteValidation.cs`: required title <= 120 chars, `ValidUntil` cannot be in the past, and a 200-line-per-quote cap enforced at the handler level (a per-row CHECK constraint cannot see sibling row counts). `CK_QuoteLines_LineKindIntegrity` plus a matching handler check enforce that a Part line carries no `LaborTypeId` and a Labor line carries no `PartId`.
- Line and quote totals are stored, not computed on read: `Pricing/QuoteLineCalculator` and `Pricing/QuoteTotalsCalculator` are the only place amounts are computed, and `AutoServiceDbContext.ValidateQuoteTotals` throws on `SaveChanges`/`SaveChangesAsync` if a modified quote's stored totals disagree with its loaded lines, or if totals changed without loading `Lines`.
- Demo seed (`Data/DemoDataInitializer.QuotesSeed.cs`) inserts 3 quotes (6 lines total) keyed by `QuoteNumber`, idempotent across restarts, and skips any seed whose vehicle/mechanic/part/labor-type natural-key reference cannot be resolved instead of throwing during startup.
- `GET /api/quotes/{id}/pdf` renders the quote with QuestPDF and answers `application/pdf` named after the quote number; a missing quote is 404, never 500. Every status is printable, and the document prints its own status, expiry included.
- `Quotes/Pdf/` holds the render pipeline: `QuoteDocumentModel` (flat, no EF entity reaches the renderer), `QuoteDocument` (A4 portrait, 2 cm margins, repeating letterhead and page counter), `QuoteDocumentSections[.Lines]` (sections, with separate parts and labor blocks whose column labels differ), `QuoteDocumentFormatting` (hu-HU culture pinned, unit prices two decimals, line and total amounts whole forints) and `QuoteDocumentAssets` (embedded Noto Sans faces and the black logo).
- PDF runtime setup lives in the composition root: the QuestPDF Community license, `UseSystemFonts = false` and `ThrowOnMissingTextGlyphs = true`. A font without the Hungarian letters therefore fails the request instead of printing empty boxes on a customer's paper.
- `Configuration/CompanyProfileResolver.cs` resolves the `CompanyProfile` section (name, address, postal code, city, tax number, phone, email), letting `CompanyProfile__*` environment variables win, and fails fast at startup on a missing field or a template marker. Real company data never enters the repository.
- The part number and labor code printed next to a line description come from the live catalog, not from the line snapshot: the snapshot keeps description, price and VAT rate only, so a hand-written or orphaned line prints a dash.

## Company Result Anchors

- `GET /api/company-results?year={int?}&month={int?}` (`Reporting/CompanyResultEndpoints.*`) under the `MechanicOnly` policy, the first aggregating endpoint in the project. It follows the AdminEndpoints pattern: hand-written LINQ projected straight into a DTO, no service layer.
- A quote belongs to the period its `CreatedAt` falls in, whatever its status is today, so the monthly figures add up to the yearly one and a past month never changes because an old quote was accepted now. The period is cut as a UTC range, the same way the monthly appointment query cuts one.
- `Sent` splits into two rows at query time from `ValidUntil >= now`: pending (still live) and expired. There is no stored Expired status, so the report ages with the calendar without a background job. `Draft` appears in no revenue row at all, only as a count.
- An empty period answers 200 with zeroed rows and a full month list, never 404, so the page has one rendering path. An out-of-range year or month is 400 `invalid_date_range`, matching the appointment month query.
- Totals come from the stored quote amounts; the VAT and parts/labor breakdowns come from the accepted quotes' stored line amounts. Nothing is recomputed in the report.

## Engineering and Size Rules

- Apply SOLID/OOP; use GoF patterns only when justified.
- Source > 500, tests > 250, class/service > 300: split required.
- Function/method target <= 60 lines where practical.

## Test and Validation Policy

- `http-endpoint-test` only for explicit request or significant API behavior change.
- `sql-database-test` only for explicit request or significant schema/persistence change.
- `e2e-playwright-test` only for explicit request or significant frontend flow change.
- Use `python scripts/run-local-test-suite.py http|sql|all` and review sanitized summary.
- Schema gate: `dotnet tool run dotnet-ef -- migrations has-pending-model-changes --project AutoService.ApiService` must pass; it runs offline (no database) and fails when entities changed without a matching migration. The EF CLI is pinned in `dotnet-tools.json`. `AutoServiceDbContextFactory` supplies the design-time context, so the gate never builds the application host and needs no secrets; CI runs it on every push.

## Always-On for Code Changes

- Run `docs-sync`.
- Run `coding-principles`.
- Run `dotnet list package --vulnerable --include-transitive` and remediate.
