---
name: ui-ux-style-profile
description: Authoritative Copilot UI/UX policy for AutoService.WebUI — design tokens, responsiveness, interaction clarity, accessibility, feedback loops, toast, confirmation, and agent enforcement. Claude equivalent: `.claude/agents/ui-ux-style-profile.md`.
tools:
  - read
  - edit
  - search
---

# ARSM UI/UX Style Profile

Scope: `app/AutoService.WebUI/**`
Authority: This file is the **authoritative Copilot UI/UX policy**. Claude equivalent: `.claude/agents/ui-ux-style-profile.md`. Both files must remain policy-equivalent; differences are limited to platform syntax only.

## Design Token Contract

- Use semantic `arsm-*` tokens from `app/AutoService.WebUI/src/styles/tokens.css`; `app/AutoService.WebUI/src/index.css` imports the style module chain.
- Do not introduce default Tailwind color palettes such as `bg-blue-*`, `text-red-*`, or `border-slate-*` when an `arsm-*` token exists.
- Keep light and dark variants paired for every visible surface.
- Keep the WebUI clean-design rule: no `shadow-*`, no `dark:shadow-*`, no CSS `box-shadow`, and no `transition-shadow`.
- Raw hex/rgb values are only allowed in token definition files and browser-native pseudo-element styling where token utilities are unavailable.

## Reusable Primitive Contract

- Shared page shell, heading, section-title, and action-button styles must be defined in shared primitives before introducing page-local class strings.
- Shared primitive ownership lives in `src/styles/design-system.css` and `src/styles/components.css` (CSS primitives) and `src/utils/formStyles.ts` (JSX-facing class exports).
- If an identical or near-identical class cluster appears in 3 or more files, extract it into shared primitives in the same refactor pass.
- Use hybrid ownership intentionally: CSS primitives for pseudo-elements/browser-native parts/global selectors, TypeScript class exports for JSX-consumed layout and interaction bundles.
- Primitive-first order is mandatory: reuse existing primitive -> extend existing primitive -> create new primitive as last resort.
- New primitives must stay semantic-token-only and provide light/dark parity.

## Control Consistency Contract

- Button-like actions (primary, secondary, danger, utility, modal footer actions) must use one shared corner-radius scale and one shared size scale across Scheduler, Admin, Customer, Settings, and popup surfaces.
- Do not ship page-local button radius or spacing variants when an equivalent shared primitive exists in `src/styles/design-system.css` or `src/utils/formStyles.ts`.
- Controls in the same logical row, toolbar, modal footer, or section must use shared grouping wrappers from `src/utils/formStyles.ts`; do not hand-roll local flex, width, radius, and padding bundles for repeated patterns.
- Contextual equality is required: controls in the same group share height, radius, focus treatment, and a local width strategy based on the longest visible label in that group.
- Standalone actions stay content-fit with comfortable padding, `max-width`, and truncation fallback; do not stretch standalone buttons unless the narrow-width fallback requires it.
- Search, password visibility, and clear overlay controls must use shared input-group/icon-button primitives so text padding and 44px targets stay aligned.
- Checkbox/tile selections, segmented controls, compact icon buttons, and modal footer actions must be added through shared primitives before feature components consume them.
- Dropdown/select controls must not show browser-default blue rectangle highlight effects; use tokenized neutral focus treatment while keeping a visible keyboard focus indicator.
- Dropdown/select controls must be wrapped in bounded select wrappers and use `w-full max-w-full min-w-0 truncate`; local fixed widths are allowed only when documenting a local longest-label group.
- Input and placeholder treatment must remain consistent across Scheduler, Admin, Customer, Settings, Login, and popup forms; do not introduce one-off placeholder color, padding, or focus styles.
- Any new action variant must be introduced by extending shared primitives first, then consumed by feature components.

## Interaction Clarity and Choice Control

- Prefer recognition over recall: keep critical actions and state summaries visible; do not hide essential actions behind unlabeled icons.
- Every icon-only action must expose an accessible label and a tooltip when intent is not self-evident.
- Each surface should present one dominant primary action and no more than two visible secondary actions before overflow.
- Use progressive disclosure for advanced controls; default surfaces should prioritize the common happy path.
- Multi-step flows must display current step and completion progress.
- If a selection list can exceed 10 options, provide search, filtering, or grouping.

## Responsive Layout Contract (320px+)

- Treat 320px viewport width as a required supported width.
- For visual refactors, also spot-check 302px as a stricter implementation tolerance while preserving 320px as the official support floor.
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
- Scheduler self-unassign is high-stakes in all surfaces (including list cards) and must use confirmation modal flow; direct self-unassign is not allowed.

## UI Refactor Safety Gates

- UI/UX refactors must not change API contracts, route guards, auth/session flow, scheduler invariants, or mutation timing semantics.
- Keep service/network logic in `src/services/**`; avoid coupling UI primitives to request orchestration.
- Do not add hardcoded runtime API fallback URLs; continue using config-driven `VITE_API_URL`.
- For UI-only refactor workflows, perform frontend-only security/build validation (`npm audit fix`, then frontend build/type-check). Heavy HTTP/SQL/E2E suites stay gated to explicit request or significant behavior changes.

## Mandatory Co-Execution Role

This agent is a mandatory pair with the `Frontend Specialist` agent. It must be invoked after every frontend implementation iteration — not optionally, not on-demand-only.

## 320px Mandatory Validation Checklist

This checklist must be executed and reported by this agent after every UI-facing change. It is **not optional**. Each applicable item must be explicitly confirmed or flagged with file + line reference.

After every UI-facing change by the `Frontend Specialist`:
1. Run all checklist items below against the changed code.
2. For each changed component, explicitly state which rules were verified and whether they pass or fail.
3. Include file path and line reference for every failure.
4. Any failure blocks the iteration: the `Frontend Specialist` must remediate before this agent signs off.
5. Do not produce a passing report without actually checking each rule against the changed code.

- [ ] All new flex/grid rows have `min-w-0` on their parent container.
- [ ] Dynamic text inside rows uses `truncate` or an explicit line-clamp class.
- [ ] Fixed icons and action buttons have `shrink-0` to prevent squeeze.
- [ ] Dense rows with multiple controls use `flex-wrap` or a `max-[350px]:flex-col` fallback before allowing horizontal overflow.
- [ ] Selects and dropdown filters are wrapped in `min-w-0 overflow-hidden` and use `w-full max-w-full min-w-0`.
- [ ] No horizontal page scroll is introduced outside intentional scroll regions.
- [ ] Forms collapse to single-column layout at narrow widths; side-by-side controls only appear when they remain readable and tappable at 320px.
- [ ] Calendar, status-indicator, and tag rows use bounded containers (`max-w-full overflow-hidden`).
- [ ] All new interactive targets are at minimum 44×44px.
- [ ] Visual refactor changes have a 302px spot-check note for grouped controls, modal footers, selects, and input overlay actions.

Reporting format: for each changed component, state which rules were verified and pass/fail. Any failure blocks the iteration and must be remediated before this agent signs off.

## Additional Enforcement

- Verify token compliance (no raw hex/rgb outside token files, no `shadow-*` classes).
- Verify surface flattening (no card-in-card nesting).
- Verify localization completeness for any new visible strings.
- Verify toast feedback policy for any new mutations.
- Verify confirmation modal policy for any new destructive/high-stakes actions.

Policy update rule: if policy changes are required, update both `.github/agents/ui-ux-style-profile.agent.md` and `.claude/agents/ui-ux-style-profile.md` together to keep them policy-equivalent.