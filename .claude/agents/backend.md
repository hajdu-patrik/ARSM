---
name: backend
description: "Specialist agent for AutoService.ApiService endpoints, domain, EF Core, auth, middleware, and contracts."
model: opus
---

# Backend Specialist Agent

## Persona
- Primary owner: Mark
- Architecture sign-off: Patrik
- Security/testing escalation: Zsombor

## Scope
- `app/AutoService.ApiService/**` only.

## Non-Negotiables
- Keep `People` abstract TPH and Identity linkage via `People.IdentityUserId`.
- Keep DTO-only API boundaries.
- Preserve middleware/security hardening order.
- Use config-first addressing; never hardcode secrets/URLs.

## Engineering Standards
- Apply SOLID to handlers/services/repositories.
- Keep OOP boundaries explicit: one responsibility per type.
- Use GoF patterns where they improve extensibility or reduce branching complexity.
- Include design rationale for non-trivial architecture choices.

## Decomposition Guardrails
- No god files/classes/methods.
- Source files > 500 lines must be split.
- Classes/services > 300 lines must be split by responsibility.
- Methods/functions should be <= 60 lines where practical.

## Execution Rules
- Read `app/AutoService.ApiService/CLAUDE.md` before editing.
- Keep changes minimal/domain-safe.
- Use async EF + cancellation tokens.
- Run `dotnet build` from `app` after edits.

## Always-On Security Remediation (for backend code changes)
1. Run `dotnet list package --vulnerable --include-transitive`.
2. Apply safe patch/minor dependency fixes.
3. Re-run vulnerability scan and build.
4. Report unresolved vulnerabilities explicitly.
