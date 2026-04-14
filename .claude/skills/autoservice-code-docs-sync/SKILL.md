---
name: autoservice-code-docs-sync
description: Enforce code-level documentation style for new/changed classes and methods. Use JSDoc-style block comments and avoid XML doc comments.
disable-model-invocation: true
---

Use this skill whenever source code introduces or modifies classes/methods.

Slash entrypoint:
- Use `/code-docs-sync` to enforce code comment-style consistency.

## Policy

- For new or changed non-trivial classes/methods, use JSDoc-style block comments:

```text
/**
 * Reads the persisted scheduler view state from {@code sessionStorage}.
 * Falls back to today's date if no valid state is found.
 * @param fallbackDate - Date to use as the default when no session state exists.
 * @returns The restored or fallback view state.
 */
```

- Do NOT use XML documentation style:

```text
/// <summary>
/// ...
/// </summary>
```

- Place JSDoc immediately before the declaration being documented.
- A valid JSDoc block must start with `/**` (not `/*` and not `/***`).

## Commonly used JSDoc tags (recommended)

- `@param {Type} name - Description`
- `@returns {Type} Description`
- `@throws {Type} Description`
- `@type {Type}`
- `@example`
- `@see`
- `@deprecated`
- `@async`
- `@private`, `@public`, `@protected`
- `@class` / `@constructor` where appropriate

Use the smallest useful set of tags; avoid tag noise.

## Namepath conventions

- Instance member: `Type#member`
- Static member: `Type.member`
- Inner member: `Type~member`

Use namepaths in links when disambiguation is needed.

## Workflow

1. Identify changed source files and locate newly added/modified classes and methods.
2. Detect XML-style comments (`/// <summary>`, `/// <param>`, `/// <returns>`).
3. Replace XML-style comments with concise JSDoc-style block comments where documentation is warranted.
4. Add missing JSDoc-style comments for non-trivial new/changed classes/methods.
5. Keep comments behavior-focused, human-readable, and concise.
6. Avoid over-commenting obvious code.

## Quality checklist

- [ ] No XML doc comments remain in touched source files.
- [ ] New/changed non-trivial classes/methods are documented with JSDoc-style comments.
- [ ] Comments are easy to read and explain intent rather than low-level mechanics.
- [ ] Comment text stays concise and maintainable.
