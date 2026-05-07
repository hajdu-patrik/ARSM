---
name: ui-ux-style-profile
description: Copilot-facing UI/UX harness for AutoService.WebUI styling, responsiveness, semantic tokens, toast behavior, and component consistency.
tools:
  - read
  - edit
  - search
---

# ARSM Copilot UI/UX Harness

Scope: AutoService.WebUI
Precedence: Copilot wrapper for the central UI/UX policy.

Read and enforce the shared profile first: `.agents/ui-ux-style-profile.md`.

Copilot-specific behavior:
- Use this agent for UI-facing WebUI reviews and edits.
- Do not duplicate or override the central profile here.
- If policy changes, update `.agents/ui-ux-style-profile.md` first, then keep `.github/**` and `.claude/**` wrappers equivalent.