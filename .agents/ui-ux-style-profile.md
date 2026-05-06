# ARSM UI/UX Style Profile (Shared Baseline)

Scope: AutoService.WebUI
Precedence: This file is the shared token/component baseline. Active platform harnesses live at `.claude/agents/ui-ux-style-profile.md` and `.github/agents/ui-ux-style-profile.agent.md`. If conflicts occur, platform-specific harnesses win, and this file remains the shared fallback contract.

## 1) Tailwind Token Contract (`arsm-*`)

Defined in [app/AutoService.WebUI/src/index.css](app/AutoService.WebUI/src/index.css) via `@theme`.

### Shell / Surface

- `surface`: `arsm-surface`, `arsm-surface-dark`
- `card`: `arsm-card`, `arsm-card-dark`
- `deep`: `arsm-deep`, `arsm-deepest`

### Typography / Text

- `text-primary`: `arsm-primary`, `arsm-primary-dark`
- `text-muted`: `arsm-muted`, `arsm-muted-dark`
- `text-label`: `arsm-label`, `arsm-label-dark`

### Borders / Inputs

- `border`: `arsm-border`, `arsm-border-dark`
- `input`: `arsm-input`, `arsm-input-dark`
- `placeholder`: `arsm-placeholder`, `arsm-placeholder-dark`

### Accent / Interaction

- `accent`: `arsm-accent`, `arsm-accent-hover`, `arsm-accent-dark`, `arsm-accent-dark-hover`
- `accent-utility`: `arsm-accent-subtle`, `arsm-accent-border`, `arsm-accent-deep`, `arsm-accent-vivid`, `arsm-accent-wash`, `arsm-accent-tint`
- `on-accent`: `arsm-on-accent`, `arsm-on-accent-dark`
- `interactive`: `arsm-focus-ring`, `arsm-hover`, `arsm-hover-dark`, `arsm-ring-dark`, `arsm-toggle-bg`, `arsm-toggle-bg-dark`

### Semantic Status

- `error`: `arsm-error-bg`, `arsm-error-bg-dark`, `arsm-error-border`, `arsm-error-border-light`, `arsm-error-text`, `arsm-error-text-light`, `arsm-error-hover`, `arsm-error-active`, `arsm-error-dark`, `arsm-error-accent`, `arsm-error-muted`, `arsm-error-soft`, `arsm-error-softest`
- `success`: `arsm-success-bg`, `arsm-success-bg-dark`, `arsm-success-border`, `arsm-success-border-dark`, `arsm-success-text`, `arsm-success-text-dark`, `arsm-success-accent`, `arsm-success-soft`
- `warning`: `arsm-warning-bg`, `arsm-warning-bg-dark`, `arsm-warning-border`, `arsm-warning-border-dark`, `arsm-warning-text`, `arsm-warning-text-dark`, `arsm-warning-accent`

## 2) Unified Component Architecture

### Buttons

- Primary CTA: rounded-xl, medium emphasis, accent fill, visible focus ring (`arsm-focus-ring`).
- Secondary/ghost: never invent ad-hoc palette; derive from existing `accent-*`, `hover*`, and `border` tokens.
- Disabled state: keep semantic contrast and use existing disabled fills (`arsm-accent-border` / `arsm-ring-dark`).

### Cards / Panels

- Base shell: `rounded-2xl` to `rounded-3xl`, bordered with `arsm-border|dark`, elevated shadow, subtle inset highlight.
- Avoid ad-hoc RGB unless already established visual language requires it.

### Inputs

- Input primitives must reuse shared form architecture (`formStyles.ts`) for consistency.
- Required behaviors: focus ring, border transition, placeholder parity in light/dark.

### Modals (Tier System)

- Tier 1 Modal (confirmation/short forms): max width 28rem-36rem, compact spacing (`p-4` to `p-6`).
- Tier 2 Modal (complex forms/detail): max width 42rem-56rem, expanded spacing (`p-6` to `p-8`).
- Modal padding on ultra-small devices: always apply `max-[320px]` fallbacks.

### 320px Responsive Safe Area

- Must include `max-[320px]` fallbacks for padding and dense typography on critical surfaces.
- No horizontal overflow at 320px viewport width.

## 3) Global Toast Notification Standard

Current implementation: [app/AutoService.WebUI/src/components/common/ToastViewport.tsx](app/AutoService.WebUI/src/components/common/ToastViewport.tsx)

- Placement: fixed top-center viewport.
- Success toast: Green semantic family (`arsm-success-*`).
- Error toast: Red semantic family (`arsm-error-*`).
- Dismiss: explicit close action + auto-dismiss timeout.
- i18n: message keys, not hardcoded display strings.

## 4) Error Display Mandate (Strict)

- Never use inline/embedded error text.
- Always use Toast notifications.
- Field-level validation still maps to i18n keys, but user-facing error surfacing must be toast-based by default.

## 5) Agent Enforcement Rules

- Do not introduce new color tokens when equivalent `arsm-*` token exists.
- Keep light/dark parity for all new UI surfaces.
- Reuse existing shared style utilities before creating new class recipes.
- If a component deviates intentionally, include a short rationale in code comments.

## 6) Platform Split

- Claude-specific harness: `.claude/agents/ui-ux-style-profile.md`
- Copilot-specific harness: `.github/agents/ui-ux-style-profile.agent.md`
- Shared policy in this file must stay semantically aligned across both platform harnesses.
