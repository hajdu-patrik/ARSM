---
name: ui-ux-sync
description: 'Enforce ARSM WebUI UI/UX policy with evidence-backed audits. Use for frontend UI code, responsive 320px behavior, style extraction boundaries, no-redesign preservation checks, buttons, animations, i18n, toast/modal flows, push-notification readiness, or ui-ux-style-profile docs changes.'
---

Use this skill for UI-facing frontend changes and UI/UX policy documentation updates.

## Trigger Signals

- UI component/layout/interaction change.
- Localization-visible text change.
- Toast/modal/confirmation flow change.
- 320px responsive verification request.
- Style extraction, shared primitive, or visual-preservation review.
- Any frontend UI/UX, responsiveness, interaction, or style-policy rule change that must keep `ui-ux-style-profile` in the agent pipeline.
- UI/UX policy file change in `.github/**` or `.claude/**`.

## Mandatory Checks

- No unintended visual redesign: preserve current colors, spacing, radii, motion, focus, layout, and responsive behavior unless explicitly requested.
- Token usage and surface consistency; no shadows.
- Extraction boundary: shared primitives contain only repeated minimum common subsets; feature-specific classes remain local.
- Button/control-group mapping, touch targets, and local semantic overrides.
- Icon-only controls keep scale-only hover behavior.
- Vehicle action icon semantics remain fixed (Eye info, Pencil warning, Trash danger).
- 320px responsive checklist pass/fail per changed component.
- Localization completeness for any new visible text.
- Toast and confirmation-popup policy adherence.
- Push-notification status explicitly reported (`implemented`, `not-implemented`, `required-missing`).

## Evidence Anchors

- Use `.github/agents/ui-ux-style-profile.agent.md` as the authoritative audit guide.
- Cite only the files actually inspected or changed.

## Output Contract

1. Scope
2. Visual preservation status
3. Extraction-boundary findings
4. 320px checklist per component
5. Evidence
6. Push status
7. Remediation plan and validation summary
