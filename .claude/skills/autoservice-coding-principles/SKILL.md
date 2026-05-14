---
name: autoservice-coding-principles
description: 'Enforce ARSM source-quality rules for changed `.cs`, `.ts`, and `.tsx` files. Use when source changes require SOLID/OOP/GoF review, JSDoc-style comments, naming cleanup, anti-god-file splits, or coding-principles remediation.'
disable-model-invocation: true
---

Use this skill whenever source files (`.cs`, `.ts`, `.tsx`) change.

## Purpose
Maintain readable, scalable, and maintainable code by enforcing SOLID/OOP/GoF-aware structure and anti-monolith decomposition.

## Mandatory Behavior
- Auto-remediate (not report-only).
- Enforce JSDoc-style comments for non-trivial changed/new declarations.
- Remove XML doc style (`/// <summary>`, etc.).
- Improve naming and structural clarity while preserving behavior.
- Require engineering rationale on non-trivial structural/design remediations.

## Engineering Enforcement
- SOLID compliance on changed boundaries.
- OOP clarity: one responsibility per class/component/service.
- Pragmatic GoF usage only when it reduces complexity and improves extension.

## Decomposition Guardrails
- Source files > 500 lines: split required.
- Test files > 250 lines: split required.
- Class/service > 300 lines: split by responsibility.
- Methods/functions > 60 lines: split to focused helpers.

## Workflow
1. Scan changed source files.
2. Apply required comment/style remediations.
3. Resolve readability/maintainability and responsibility-boundary issues.
4. Split oversized files/classes/methods where limits are exceeded.
5. Re-check consistency.
6. Report remediations, rationale, and residual risks.
