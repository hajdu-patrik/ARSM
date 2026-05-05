---
name: autoservice-http-endpoint-test
description: Maintain HTTP API test suites with strict trigger-gating and automatic feature-coverage generation.
---

Use this skill to sync `tests/API/**/*.http` only.

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
