# AutoService.WebUI Rules

## Scope and Ownership

- Primary owner: Gergely
- Architecture sign-off: Patrik
- QA/security escalation: Zsombor

## Decision Ownership

- The user owns frontend product, UX, interaction, style, routing, copy, and behavior decisions.
- Do not add or change UI behavior, visual style, layout, text, feedback flows, tests, documentation policy, abstractions, or shared style primitives unless explicitly requested, specified by instructions, or agreed in the active plan.
- If frontend requirements are ambiguous, ask the user before choosing an approach.

## Core Rules

- React + TypeScript + Tailwind only.
- i18n for all user text (EN + HU).
- No hardcoded `VITE_API_URL` fallback.
- Vite dev server binds to `localhost` by default; use `VITE_DEV_HOST` only for explicit local opt-in.
- Keep API logic in `src/services`; keep UI logic in components/hooks/pages.
- Private authenticated read models use TanStack Query with person/role-scoped keys, sessionStorage persistence, and cache clearing on auth-boundary transitions.
- Clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).
- Style-system work is visual-preserving by default. Do not change current colors, spacing, radii, motion, focus, layout, or responsive behavior unless the user explicitly requests a redesign.

## Mandatory UI/UX Policy Coupling

- Source of truth: `.claude/agents/ui-ux-style-profile.md`.
- Every UI-facing, UI/UX, responsiveness, interaction, style-token, or style-architecture iteration is implemented by `frontend`, which applies the `ui-ux-style-profile` policy itself.
- `ui-ux-style-profile` then audits the changed WebUI files report-only (visual consistency, extraction boundaries, accessibility, feedback loops, 320px behavior); `frontend` fixes the findings in the gate's fix round.
- Iterate until implementation and UI/UX audit both pass.

## Current UI Contract Anchors

- Customer search includes customer fields and related vehicle plates.
- Customer/vehicle history uses details panel or split-view flow.
- Scheduler intake supports email, exact plate, and name multi-result lookup.
- Scheduler and customer reads keep query-cache stale times, visible-tab background refresh, and mutation invalidation behavior aligned with `src/services/cache`.
- Live update channels are built with `createLiveUpdateChannel` (`src/services/live`), which owns the SSE connection lifecycle, reference counting, auth-aware reconnect and logout teardown. A channel only supplies its URL, SSE event name, DOM event name and payload parser; do not hand-roll a second EventSource.
- The scheduler subscribes to `/api/appointments/updates` while mounted and refreshes the current view on each event, rather than patching local state, because an appointment can move between months.
- Profile picture upload accepts JPEG/PNG/WebP up to 4 MB (`MAX_PROFILE_PICTURE_BYTES`); the size check runs on both the selected file and the cropped blob, because cropping re-encodes and changes the size that is actually sent.
- The crop modal produces `image/webp` at quality 0.9 with a `.webp` file name (`src/utils/imageCrop.ts`); the API re-encodes to WebP again server-side.
- Parts and labor types live on `/inventory`: two tabs (Parts, Labor types) reflected in the URL (`?tab=parts` / `?tab=labor-types`), rendered by one generic `CatalogTab` (`pages/Inventory/components/CatalogTab.tsx`, configured by `catalogTab.config.ts`) sharing one generic `CatalogFormModal` (`components/CatalogFormModal.tsx`, configured by `catalogForm.config.ts`) and the delete modal, instead of separate Parts/Labor types tab and form components. Every gross value shown in a list row comes from the server DTO (`grossUnitPrice` / `grossHourlyRate`); the one client-side gross computation in the whole pricing vertical is the create/edit live preview (`computeLiveGrossPreview` in `pages/Inventory/helpers.ts`), which mirrors `Pricing/PricingCalculator.GrossUnitPrice` exactly.
- Quotes live on `/quotes`: the list carries search (quote number, title, plate) and a status filter whose `Expired` option reads the server-computed `isExpired` flag, never a stored status. Every row renders all three actions (open, download, delete); a non-draft row's delete button stays present but is natively `disabled`, with its title switching to `quotes.deleteDraftOnlyHint`, because only a draft can be deleted.
- A quote is anchored to a vehicle, so creation starts from the vehicle row on the Customers page (`FilePlus`, accent tone, outside the fixed Eye/Pencil/Trash semantics) and navigates to `/quotes?vehicleId=<id>&new=1`; the Quotes page consumes those parameters once and opens the create modal.
- `QuoteEditorModal` is split into `.header`, `.lines`, `.totals` and `.footer` files, and its body scrolls inside the dialog (`max-h-[60vh]`), because a document-sized modal otherwise pushes its footer actions off screen.
- The `.lines` section renders through `QuoteLineForm` (the inline add/edit editor) and `QuoteLineRow` (the saved-line display row); `resolveLineLabelKeys` and `applyCatalogSelection` live in `pages/Quotes/helpers.ts` so the add flow and the row share one source. Once the quote can no longer be edited, the actions column is omitted entirely, from the header down, rather than rendered disabled.
- Editor affordances follow the quote status: a draft is fully editable, a sent quote keeps its fields visible but disabled with a notice and only accepts a validity extension, and a decided quote is read-only. The appointment link is set at creation only, because the header update contract does not carry it.
- Every amount rendered on a saved line or in the totals comes from the server DTO. The only client-side computation is the live line preview in `pages/Quotes/helpers.ts`, which mirrors the server formula.
- The quote line editor relabels itself by line kind: a part is counted in pieces at a net unit price, labor in hours at a net hourly rate.
- Company results live on `/company-results`: a year plus an optional month, the accepted net and gross as the headline, and the pending, expired and rejected amounts beside them at a lower weight. Every figure comes from the server DTO through `formatHuf`, so the page shows whole forints and never derives an amount. Charts are deliberately out of scope. The month and VAT breakdowns render through `DataList`; in `CompanyResultSummary` no financial figure is ever ellipsized (`[overflow-wrap:anywhere]`, headline `text-xl sm:text-2xl`).
- The quote PDF is downloaded through `quoteService.downloadPdf` (blob response, file name taken from `Content-Disposition`) and handed to the browser by `saveBlobAsFile`, which revokes the object URL right after the click. The action sits both on the list row and in the editor footer, and it is offered in every status, because every status is printable.
- `utils/currency.ts` exports two formatters, never a value the server did not already compute: `formatHuf` for whole-forint amounts (line/total amounts, report totals) and `formatHufUnitPrice` for a unit price or hourly rate with exactly 2 decimals.
- `utils/number.ts` exports `formatQuantity(value, locale)` for locale-aware quantities and counts (line quantities/hours, quote/month counts); it only formats and never rounds or derives a value the caller did not already have. Money still goes only through `formatHuf` / `formatHufUnitPrice`.
- The pricing vertical's locale strings live in their own pair, `utils/locales/{en,hu}.pricing.ts`, merged into `en.ts`/`hu.ts` alongside the existing `.core.ts`/`.feature.ts` split, with the same EN/HU key-for-key parity discipline.

## Current Style Contract Anchors

- Canonical style sources: `src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`, `src/utils/formStyles.ts`, `src/styles/tokens.css`.
- Extract only the repeated minimum common subset: geometry, base layout, radius, focus, motion, disabled state, typography, and reusable responsive wrappers.
- Keep feature-specific color, state, placement, spacing, icons, and rare variants local in the owning TS/TSX file or feature module.
- Aligned lists (Quotes, quote lines, Inventory parts/labor types, Company results months and VAT rows) share one primitive, `DataList`/`DataListRow` (`src/components/common/DataList.tsx`): the list root is one CSS grid, and the header and every row share it via `grid-cols-subgrid`, so columns cannot drift with text/number length or icon count. The tile/table switch is a container query on the list's own width (`dataListBreakpointClasses` in `utils/styles/surfaceStyles.ts`; `lg` | `3xl` | `4xl`), not a viewport breakpoint, because the collapsible sidebar changes the available width. `DataList`'s own loading spinner (`role="status"`) and dashed empty-state box (`emptyStateBoxClass`) follow the same pattern the Customers list already used. Only the column grid template (for example `quoteColumnsClass` in `QuoteList.tsx`, `catalogColumnsClass` in `Inventory/components/CatalogTab.tsx`) stays a feature-local literal applied once at the list root; the subgrid/container-query mechanics live in the shared component, not per feature.
- Row-level 44x44 icon actions (`rowIconActionInfoClass` / `rowIconActionWarningClass` / `rowIconActionDangerClass` / `rowIconActionAccentClass` in `utils/styles/buttonStyles.ts`) and right-aligned tabular numbers (`numericValueTextClass` / `numericMutedValueTextClass` in `utils/styles/textStyles.ts`) are shared primitives reused across Customers' `VehicleItem`, Quotes' `QuoteCard` / `QuoteLineRow`, and Inventory's `CatalogItemRow`.
- Compose component styles by importing a small shared base and adding local semantic classes in `className`.
- Do not create global style exports for one-off or domain-specific details.
- Icon-only controls must use scale-only hover behavior.
- Vehicle icon semantics stay fixed: Eye=info, Pencil=warning, Trash=danger.
- Interactive controls must preserve existing touch targets and 320px behavior.

## Validation Policy

- Frontend security remediation (`npm audit fix`) runs in the `scripts/validate.py` security stage when `package.json` or `package-lock.json` changes.
- Validate with `python scripts/validate.py` (runs `npx tsc -b --noEmit` and eslint on the changed files), and `npm run build` when needed. Plain `tsc --noEmit` type-checks nothing here, because the root `tsconfig.json` is solution-style (`files: []` + `references`); only build mode (`-b`) walks the referenced projects.
- Style refactors need before/after visual preservation evidence for affected surfaces, including 320px when layout can wrap.
- E2E only on gate: `python scripts/run-local-test-suite.py playwright` and inspect sanitized report.

## Always-On

- Run `docs-sync`.
- Run `coding-principles`.
