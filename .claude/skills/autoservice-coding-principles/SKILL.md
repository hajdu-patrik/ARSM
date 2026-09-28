---
name: autoservice-coding-principles
description: 'Enforce ARSM source-quality rules for changed `.cs`, `.ts`, and `.tsx` files. Use when source changes require SOLID/OOP/GoF review, 2-line JSDoc-style comments, naming cleanup, anti-god-file splits, or coding-principles remediation.'
disable-model-invocation: true
---

Use this skill whenever changed source includes `.cs`, `.ts`, or `.tsx`.

## Mandatory Behavior

- Auto-remediate; do not report-only.
- Enforce SOLID/OOP boundaries and pragmatic GoF usage.
- Require a JSDoc-style summary comment for non-trivial changed/new declarations.
- Every comment is at most 2 lines, doc comments included (JSDoc-style `/** */` blocks carry one short summary, no `@param`/`@returns` lists; the types live in the signature). Shorten or drop longer comments in the files you touch.
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
