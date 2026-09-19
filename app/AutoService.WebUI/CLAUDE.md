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
- Every UI-facing, UI/UX, responsiveness, interaction, style-token, or style-architecture iteration must co-run `frontend` + `ui-ux-style-profile`.
- `frontend` implements behavior and local composition; `ui-ux-style-profile` audits visual consistency, extraction boundaries, accessibility, feedback loops, and 320px behavior.
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
- Parts and labor types live on `/inventory`: two tabs (Parts, Labor types) sharing create/edit and delete modals, with the active tab reflected in the URL (`?tab=parts` / `?tab=labor-types`). Every gross value shown in a list row comes from the server DTO (`grossUnitPrice` / `grossHourlyRate`); the one client-side gross computation in the whole pricing vertical is the create/edit live preview (`computeLiveGrossPreview` in `pages/Inventory/helpers.ts`), which mirrors `Pricing/PricingCalculator.GrossUnitPrice` exactly.
- Quotes live on `/quotes`: the list carries search (quote number, title, plate) and a status filter whose `Expired` option reads the server-computed `isExpired` flag, never a stored status.
- A quote is anchored to a vehicle, so creation starts from the vehicle row on the Customers page (`FilePlus`, accent tone, outside the fixed Eye/Pencil/Trash semantics) and navigates to `/quotes?vehicleId=<id>&new=1`; the Quotes page consumes those parameters once and opens the create modal.
- `QuoteEditorModal` is split into `.header`, `.lines`, `.totals` and `.footer` files, and its body scrolls inside the dialog (`max-h-[60vh]`), because a document-sized modal otherwise pushes its footer actions off screen.
- Editor affordances follow the quote status: a draft is fully editable, a sent quote keeps its fields visible but disabled with a notice and only accepts a validity extension, and a decided quote is read-only. The appointment link is set at creation only, because the header update contract does not carry it.
- Every amount rendered on a saved line or in the totals comes from the server DTO. The only client-side computation is the live line preview in `pages/Quotes/helpers.ts`, which mirrors the server formula.
- The quote line editor relabels itself by line kind: a part is counted in pieces at a net unit price, labor in hours at a net hourly rate.
- Company results live on `/company-results`: a year plus an optional month, the accepted net and gross as the headline, and the pending, expired and rejected amounts beside them at a lower weight. Every figure comes from the server DTO through `formatHuf`, so the page shows whole forints and never derives an amount. Charts are deliberately out of scope.
- The quote PDF is downloaded through `quoteService.downloadPdf` (blob response, file name taken from `Content-Disposition`) and handed to the browser by `saveBlobAsFile`, which revokes the object URL right after the click. The action sits both on the list row and in the editor footer, and it is offered in every status, because every status is printable.
- `utils/currency.ts` exports two formatters, never a value the server did not already compute: `formatHuf` for whole-forint amounts (line/total amounts, report totals) and `formatHufUnitPrice` for a unit price or hourly rate with exactly 2 decimals.
- The pricing vertical's locale strings live in their own pair, `utils/locales/{en,hu}.pricing.ts`, merged into `en.ts`/`hu.ts` alongside the existing `.core.ts`/`.feature.ts` split, with the same EN/HU key-for-key parity discipline.

## Current Style Contract Anchors

- Canonical style sources: `src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`, `src/utils/formStyles.ts`, `src/styles/tokens.css`.
- Extract only the repeated minimum common subset: geometry, base layout, radius, focus, motion, disabled state, typography, and reusable responsive wrappers.
- Keep feature-specific color, state, placement, spacing, icons, and rare variants local in the owning TS/TSX file or feature module.
- The quote line row grid (`quoteLineRowGridClass` in `QuoteLineEditorRow.tsx`) and the catalog row layout stay local to their own component files rather than joining `utils/styles/`: a pricing-specific row grid was judged too narrow to pay for a shared primitive.
- Compose component styles by importing a small shared base and adding local semantic classes in `className`.
- Do not create global style exports for one-off or domain-specific details.
- Icon-only controls must use scale-only hover behavior.
- Vehicle icon semantics stay fixed: Eye=info, Pencil=warning, Trash=danger.
- Interactive controls must preserve existing touch targets and 320px behavior.

## Validation Policy

- Frontend security remediation: `npm audit fix`.
- Validate with `npx tsc -b` and `npm run build` when needed. Plain `tsc --noEmit` type-checks nothing here, because the root `tsconfig.json` is solution-style (`files: []` + `references`); only build mode (`-b`) walks the referenced projects.
- Style refactors need before/after visual preservation evidence for affected surfaces, including 320px when layout can wrap.
- E2E only on gate: `python scripts/run-local-test-suite.py playwright` and inspect sanitized report.

## Always-On

- Run `docs-sync`.
- Run `coding-principles`.
