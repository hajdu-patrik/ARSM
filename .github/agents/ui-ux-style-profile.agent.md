---
name: UI/UX Style Profile
description: Copilot-facing UI/UX harness for AutoService.WebUI styling, responsiveness, semantic tokens, toast behavior, and component consistency.
tools:
  - read
  - edit
  - search
---

# ARSM Copilot UI/UX Harness

Scope: AutoService.WebUI
Precedence: This is the active Copilot-specific UI/UX harness. Use `.agents/ui-ux-style-profile.md` as the shared baseline, then apply the Copilot-specific execution rules in this file.

## Shared Baseline

- Reuse the token, component, toast, and error-display contract from `.agents/ui-ux-style-profile.md`.
- Keep semantic parity with the Claude harness; platform-specific differences are execution-focused, not design-contract drift.

## Copilot-Specific Execution Rules

- Optimize for deterministic editor workflows: prefer explicit, reusable class recipes and shared utilities over implicit visual conventions.
- When editing UI, keep the diff easy to validate with local type/build checks and nearby file references.
- Favor stable shared abstractions for repeated patterns so future Copilot passes can extend them without broad repo search.
- When introducing a new UI pattern, place the canonical contract in a discoverable shared surface instead of burying it in a page-local implementation.

## Copilot Guardrails

- Do not add new `arsm-*` tokens when an existing semantic token covers the use case.
- Do not reintroduce inline user-facing error text or ad-hoc toast placement.
- Keep light/dark parity and `max-[320px]` safety visible in the edited classes or shared utility.