---
name: ui-ux-style-profile
description: Central ARSM WebUI design, responsiveness, toast, confirmation, and agent enforcement profile.
---

# ARSM UI/UX Style Profile

Scope: `app/AutoService.WebUI/**`
Authority: This file is the shared UI/UX source of truth for Claude Code and GitHub Copilot. Platform-specific agent files may wrap it, but must not redefine conflicting policy.

## Design Token Contract

- Use semantic `arsm-*` tokens from `app/AutoService.WebUI/src/index.css`.
- Do not introduce default Tailwind color palettes such as `bg-blue-*`, `text-red-*`, or `border-slate-*` when an `arsm-*` token exists.
- Keep light and dark variants paired for every visible surface.
- Keep the WebUI clean-design rule: no `shadow-*`, no `dark:shadow-*`, no CSS `box-shadow`, and no `transition-shadow`.

## 320px Responsiveness

- Treat 320px viewport width as a required supported width.
- Dynamic text inside flex/grid rows must use the containment trio: parent `min-w-0`, text `truncate` or line clamp, fixed actions/icons `shrink-0`.
- Selects and dropdown filters must be inside `min-w-0 overflow-hidden` containers and use `w-full max-w-full min-w-0 truncate`.
- Dense rows with independent controls should use `flex-wrap`, `basis-full sm:basis-auto`, or a `max-[350px]:flex-col` fallback before allowing horizontal overflow.
- Calendar/status indicator rows must use bounded containers such as `max-w-full overflow-hidden h-4`; render only the meaningful maximum plus an overflow counter.

## Surface Flattening

- Do not put cards inside cards. Use one owning surface, then separate inner content with `border-t`, `border-b`, `divide-y`, spacing, or simple rows.
- Repeated history/list rows should be flat full-width rows or buttons, not nested rounded cards unless the row is the primary standalone object.
- Preserve scanability with `gap-3`/`gap-4`, clear section headings, and stable row heights where content can change.

## Toast Feedback Loop

- Mutations must report success/failure through the global top-center toast viewport.
- Success feedback uses `arsm-success-*`; failure, auth, and validation feedback use `arsm-error-*`.
- User-visible toast content must resolve through i18n keys. Do not surface raw backend English text in Hungarian mode.
- Toasts keep their explicit dismiss action.
- Do not render dynamic page-level/server error text inline; field validation may mark fields, but mutation outcomes belong in toast feedback.

## Confirmation Modal Policy

- Destructive or high-stakes actions must follow click -> confirmation modal -> confirmed mutation.
- Confirmation copy and buttons must be i18n-backed and use semantic tokens.
- Modal-based confirmations must not rely on an X close icon; closing remains available through overlay, Escape, and explicit cancel actions.
- Exception: scheduler quick self-unassign from list cards may remain direct to preserve rapid triage, but it still requires backend invariants and toast feedback.

## Frontend Agent Mandate

- Frontend agents must read this profile before UI-facing edits.
- UI changes must preserve component responsibility boundaries and avoid one-off local style systems.
- Any new UI primitive must document why an existing shared primitive was insufficient, unless it is a straightforward page-local composition.
- Docs Sync must keep `.github/**`, `.claude/**`, and this central profile policy-equivalent.