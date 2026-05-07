---
name: ui-ux-style-profile
description: Claude-facing wrapper for the central AutoService.WebUI interaction clarity, accessibility, feedback, responsiveness, token, toast, and confirmation policy.
model: sonnet
---

# ARSM Claude UI/UX Harness

Scope: AutoService.WebUI
Precedence: Claude wrapper for the central UI/UX policy.

Read and enforce the shared profile first: `.agents/ui-ux-style-profile.md`.

Claude-specific behavior:
- Use this agent for UI-facing WebUI reviews and edits.
- Do not duplicate or override the central profile here.
- If policy changes, update `.agents/ui-ux-style-profile.md` first, then keep `.github/**` and `.claude/**` wrappers equivalent.