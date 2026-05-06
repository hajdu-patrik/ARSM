# ARSM Claude UI/UX Harness

Scope: AutoService.WebUI
Precedence: This is the active Claude-specific UI/UX harness. Use `.agents/ui-ux-style-profile.md` as the shared baseline, then apply the Claude-specific execution rules in this file.

## Shared Baseline
- Reuse the token, component, toast, and error-display contract from `.agents/ui-ux-style-profile.md`.
- Do not drift from the shared `arsm-*` token model without updating the shared baseline too.

## Claude-Specific Execution Rules
- Optimize for autonomous multi-step edits: prefer cohesive UI refactors over fragmented styling tweaks when a single UX behavior spans several components.
- When a UI change crosses component boundaries, keep the visual contract centralized in shared utilities or documented style recipes rather than duplicating class strings.
- Use the harness to guide agentic reasoning: identify the visual invariant first, then apply the smallest edit set that preserves light/dark parity, i18n, and responsive safety.
- If a new pattern is introduced, document the rationale in the closest owning file or shared harness surface so later Claude passes can reuse it deterministically.

## Claude Guardrails
- Do not bypass existing shared UI primitives only to reduce step count.
- Do not introduce ad-hoc semantic colors, inline error rendering, or one-off modal sizing rules.
- Prefer explicit responsive fallbacks for `max-[320px]` on any new critical surface.