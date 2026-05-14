---
name: autoservice-http-endpoint-test
description: 'Maintain ARSM HTTP `.http` endpoint suites. Use when API endpoints, DTO validation, auth/role behavior, status/error contracts, tests/API files, or explicit HTTP test requests require coverage updates.'
---

Use this skill to sync `tests/API/**/*.http` only.

## Persona
- Primary owner: Zsombor
- Architecture escalation: Patrik

## Why This Skill Exists

- HTTP suites verify the real API contract at the boundary where status codes, auth rules, payload validation, and error keys matter.
- This skill prevents contract drift between handlers, DTOs, and consumer expectations.

## When to Use It

- Use it for endpoint behavior changes, DTO validation changes, auth/role policy changes, or when the user explicitly asks for HTTP test execution or maintenance.
- Do not use it for purely internal refactors that preserve the public API contract.

## What Breaks If Ignored

- Consumers can receive unexpected status codes, payloads, or auth failures without an early signal in the test layer.
- Stale `.http` scenarios stop reflecting the live API and lose value as regression guards.

## Trigger Gate (mandatory)
Run only when:
- explicitly requested, or
- significant API contract/behavior change exists.
Otherwise: return `SKIPPED`.

## New Feature Rule
If triggered by a new feature:
- auto-generate missing endpoint coverage before executing/updating tests.

## Coverage Requirements
- For each changed endpoint, include at least one positive and one negative scenario.
- Include auth/role checks (`401`, `403`) when behavior depends on authorization.
- Include contract/validation checks (`400`, `409`, `422`) when payload semantics changed.
- Keep status-code and error-key expectations aligned with current handlers.

## Credentials Policy (Mandatory)
- Credentials and host address are consumed from `tests/.env` (gitignored) via `{{$processEnv VAR_NAME}}`.
- Template: `tests/.env.example` (committed — placeholder values only).
- Variables: `AutoService_ApiService_HostAddress`, `ARSM_TEST_PASSWORD`, `ARSM_TEST_WRONG_PASSWORD`, `ARSM_TEST_ADMIN_EMAIL`, `ARSM_TEST_ADMIN_PASSWORD`, `ARSM_TEST_MECHANIC_EMAIL`, `ARSM_TEST_MECHANIC_PASSWORD`, `ARSM_TEST_MECHANIC_NEW_PASSWORD`, `ARSM_TEST_CUSTOMER_EMAIL`.
- Never write literal email/password/host values in `.http` files; always use `{{$processEnv VAR}}`.
- If a variable is absent: surface the name, point to `tests/.env.example` — do not guess.

## Test Design Guardrails
- Prefer `.http` files <= 180 lines.
- Hard split required when a `.http` file exceeds 250 lines.
- Keep chunk boundaries clear by domain responsibility.
- Keep all credentials and host settings environment-driven.

## Workflow
1. Read endpoint and contract deltas from mapper/contracts.
2. Map each delta to the relevant `.http` suite file.
3. Add/update positive and negative scenarios for changed behavior.
4. Remove stale scenarios tied to removed or changed contracts.
5. Validate variable usage and request consistency.
6. Report added/updated/removed cases and residual coverage gaps.
