---
name: autoservice-coding-principles
description: 'Enforce ARSM source-quality rules for changed `.cs`, `.ts`, and `.tsx` files. Use when source changes require SOLID/OOP/GoF review, JSDoc-style comments, naming cleanup, anti-god-file splits, or coding-principles remediation.'
---

Use this skill whenever changed source includes `.cs`, `.ts`, or `.tsx`.

## Mandatory Behavior

- Auto-remediate; do not report-only.
- Enforce SOLID/OOP boundaries and pragmatic GoF usage.
- Require JSDoc-style comments for non-trivial changed/new declarations.
- Remove XML-doc style comments.
- Improve naming/structure while preserving behavior.
- Document rationale for non-trivial structural remediations.

## Size Guardrails

- Source file > 500 lines: split.
- Test file > 250 lines: split.
- Class/service > 300 lines: split.
- Method/function target <= 60 lines where practical.

## Output Contract

- Files changed.
- Rules applied.
- Remaining risks and follow-up actions.
