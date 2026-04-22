---
name: autoservice-coding-principles
description: Enforce coding standards — JSDoc comments, naming conventions, and structural quality — across changed source files.
---

Use this skill whenever source code introduces or modifies classes, methods, or components.

## Policy

### Comment Style
- For new or changed non-trivial classes/methods, use JSDoc-style block comments:

```text
/**
 * Reads the persisted scheduler view state from {@code sessionStorage}.
 * Falls back to today's date if no valid state is found.
 * @param fallbackDate - Date to use as the default when no session state exists.
 * @returns The restored or fallback view state.
 */
```

- Do NOT use XML documentation style (`/// <summary>`, `/// <param>`, `/// <returns>`).
- Place JSDoc immediately before the declaration being documented.
- A valid JSDoc block must start with `/**` (not `/*` or `/***`).

### Commonly used JSDoc tags
- `@param {Type} name - Description`
- `@returns {Type} Description`
- `@throws {Type} Description`
- `@type {Type}`, `@example`, `@see`, `@deprecated`

Use the smallest useful set of tags; avoid tag noise.

### Naming Conventions
- Descriptive names for variables, methods, DTOs, and components.
- No single-letter variables outside loop counters.
- Boolean names should read as yes/no questions (`isValid`, `hasAccess`).
- Namepath conventions: instance `Type#member`, static `Type.member`, inner `Type~member`.

### Structural Quality
- Functions/methods should be single-purpose and small.
- Avoid duplicated logic — centralize shared behavior.
- Keep side effects localized and explicit.
- Clear component/module boundaries.

## Workflow

1. Identify changed source files and locate newly added/modified classes, methods, components.
2. Detect XML-style comments and replace with JSDoc-style block comments where warranted.
3. Add missing JSDoc-style comments for non-trivial new/changed declarations.
4. Flag naming or structural issues that clearly violate project standards.
5. Keep comments behavior-focused, human-readable, and concise.
6. Avoid over-commenting obvious code.

## Quality checklist

- [ ] No XML doc comments remain in touched source files.
- [ ] New/changed non-trivial declarations are documented with JSDoc-style comments.
- [ ] Comments explain intent rather than low-level mechanics.
- [ ] Naming follows project conventions (descriptive, no abbreviations).
- [ ] No obvious structural violations (duplication, oversized functions).
