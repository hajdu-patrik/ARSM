---
name: ui-ux-style-profile
description: Central ARSM WebUI design, responsiveness, interaction clarity, accessibility, feedback loops, and agent enforcement profile.
---

# ARSM UI/UX Style Profile

Scope: `app/AutoService.WebUI/**`
Authority: This file is the shared UI/UX source of truth for Claude Code and GitHub Copilot. Platform-specific agent files may wrap it, but must not redefine conflicting policy.

## Design Token Contract

- Use semantic `arsm-*` tokens from `app/AutoService.WebUI/src/index.css`.
- Do not introduce default Tailwind color palettes such as `bg-blue-*`, `text-red-*`, or `border-slate-*` when an `arsm-*` token exists.
- Keep light and dark variants paired for every visible surface.
- Keep the WebUI clean-design rule: no `shadow-*`, no `dark:shadow-*`, no CSS `box-shadow`, and no `transition-shadow`.
- Raw hex/rgb values are only allowed in token definition files and browser-native pseudo-element styling where token utilities are unavailable.

## Reusable Primitive Contract

- Shared page shell, heading, section-title, and action-button styles must be defined in shared primitives before introducing page-local class strings.
- Shared primitive ownership lives in `src/styles/design-system.css` (CSS primitives) and `src/utils/formStyles.ts` (JSX-facing class exports).
- If an identical or near-identical class cluster appears in 3 or more files, extract it into shared primitives in the same refactor pass.
- Use hybrid ownership intentionally: CSS primitives for pseudo-elements/browser-native parts/global selectors, TypeScript class exports for JSX-consumed layout and interaction bundles.
- Primitive-first order is mandatory: reuse existing primitive -> extend existing primitive -> create new primitive as last resort.
- New primitives must stay semantic-token-only and provide light/dark parity.

## Interaction Clarity and Choice Control

- Prefer recognition over recall: keep critical actions and state summaries visible; do not hide essential actions behind unlabeled icons.
- Every icon-only action must expose an accessible label and a tooltip when intent is not self-evident.
- Each surface should present one dominant primary action and no more than two visible secondary actions before overflow.
- Use progressive disclosure for advanced controls; default surfaces should prioritize the common happy path.
- Multi-step flows must display current step and completion progress.
- If a selection list can exceed 10 options, provide search, filtering, or grouping.

## Responsive Layout Contract (320px+)

- Treat 320px viewport width as a required supported width.
- Build mobile-first: base styles target narrow widths first, then enhance with `sm`/`md`/`lg` breakpoints.
- Dynamic text inside flex/grid rows must use the containment trio: parent `min-w-0`, text `truncate` or line clamp, fixed actions/icons `shrink-0`.
- Selects and dropdown filters must be inside `min-w-0 overflow-hidden` containers and use `w-full max-w-full min-w-0 truncate`.
- Dense rows with independent controls should use `flex-wrap`, `basis-full sm:basis-auto`, or a `max-[350px]:flex-col` fallback before allowing horizontal overflow.
- Dense action clusters should default to `flex-wrap` and collapse controls to full-width at very small widths before any horizontal overflow is allowed.
- Calendar/status indicator rows must use bounded containers such as `max-w-full overflow-hidden h-4`; render only the meaningful maximum plus an overflow counter.
- Forms must collapse to single-column layouts at narrow widths; side-by-side controls are only allowed when they remain readable and tappable.
- Horizontal page scroll is disallowed except for intentional overflow regions with explicit affordance.

## Localization Contract

- All user-facing strings must be i18n-backed (`en.ts` and `hu.ts`): titles, subtitles, labels, placeholders, button text, helper/error copy, and aria labels.
- Toasts, inline helper text, and modal copy must never leak raw backend English text in Hungarian mode.
- Rendering should stay key-driven so locale changes update visible UI copy without remounting business flows.
- Backend error payloads shown to users must map to localized guidance; raw passthrough is forbidden in `hu` mode.

## Surface Flattening

- Do not put cards inside cards. Use one owning surface, then separate inner content with `border-t`, `border-b`, `divide-y`, spacing, or simple rows.
- Repeated history/list rows should be flat full-width rows or buttons, not nested rounded cards unless the row is the primary standalone object.
- Preserve scanability with `gap-3`/`gap-4`, clear section headings, and stable row heights where content can change.

## Content Alignment Contract

- Alignment must be intentional and state-driven, not accidental per-component drift.
- Empty/loading/error/info placeholder messages inside state panels should use centered alignment by default.
- Label-value information rows, form fields, and dense data specs should remain contextual (typically start-aligned) unless a centered treatment is explicitly required by the component pattern.
- Within the same logical block, equivalent states must use the same alignment mode (do not mix centered and left-aligned placeholders).

## Toast Feedback Loop

- Mutations must report success/failure through the global top-center toast viewport.
- Success feedback uses `arsm-success-*`; failure, auth, and validation feedback use `arsm-error-*`.
- User-visible toast content must resolve through i18n keys. Do not surface raw backend English text in Hungarian mode.
- Toasts keep their explicit dismiss action.
- For reversible operations, include an explicit undo action in the toast when backend capability exists.
- Do not render dynamic page-level/server error text inline; field validation may mark fields, but mutation outcomes belong in toast feedback.

## Feedback Latency Contract

- Every interaction must acknowledge input immediately through visible pressed, hover, focus, or pending state.
- If an operation exceeds 400ms, show explicit progress feedback near the trigger and prevent duplicate submissions.
- If an operation exceeds 1200ms, show contextual progress copy and keep cancellation or back-out paths when safe.
- Pending action controls should preserve layout stability; avoid width jumps caused by spinner-label swaps.

## Error Prevention and Recovery

- Validate close to the input point and as early as practical without noisy error flashing.
- On failed submit, focus the first invalid field and present localized, actionable guidance.
- Preserve user-entered data after failed submission unless security constraints require clearing sensitive fields.
- Destructive actions should prefer reversible patterns when possible; when not possible, confirmation is mandatory.

## Accessibility and Input Ergonomics

- Maintain WCAG AA contrast for text and key state indicators.
- Keep keyboard parity for critical actions; no pointer-only completion path.
- Do not remove visible focus indicators; tokenized custom focus styles are required when overriding defaults.
- Minimum interactive target size is 44x44px for touch-accessible controls.
- Respect `prefers-reduced-motion`; motion must not be the sole carrier of meaning.

## Confirmation Modal Policy

- Destructive or high-stakes actions must follow click -> confirmation modal -> confirmed mutation.
- Confirmation copy and buttons must be i18n-backed and use semantic tokens.
- Confirmation modals must set `showCloseButton={false}` on the shared modal shell; closing remains available through overlay, Escape, and explicit cancel actions.
- Destructive confirmation modals should default focus to the safe action (`Cancel`) rather than the destructive confirm.
- Exception: scheduler quick self-unassign from list cards may remain direct to preserve rapid triage, but it still requires backend invariants and toast feedback.

## UI Refactor Safety Gates

- UI/UX refactors must not change API contracts, route guards, auth/session flow, scheduler invariants, or mutation timing semantics.
- Keep service/network logic in `src/services/**`; avoid coupling UI primitives to request orchestration.
- Do not add hardcoded runtime API fallback URLs; continue using config-driven `VITE_API_URL`.
- For UI-only refactor workflows, perform frontend-only security/build validation (`npm audit fix`, then frontend build/type-check). Heavy HTTP/SQL/E2E suites stay gated to explicit request or significant behavior changes.

## Frontend Agent Mandate

- Frontend agents must read this profile before UI-facing edits.
- UI changes must preserve component responsibility boundaries and avoid one-off local style systems.
- Any new UI primitive must document why an existing shared primitive was insufficient, unless it is a straightforward page-local composition.
- Docs Sync must keep `.github/**`, `.claude/**`, and this central profile policy-equivalent.