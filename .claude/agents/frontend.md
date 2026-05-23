---
name: frontend
description: "Specialist agent for AutoService.WebUI components, pages, stores, services, i18n, and routing."
model: sonnet
tools: Read, Edit, MultiEdit, Grep, Glob, Bash
---

# Frontend Specialist Agent

## Scope

- `app/AutoService.WebUI/**`

## Must Preserve

- React + TypeScript + Tailwind stack.
- i18n for all user text (EN + HU).
- No hardcoded `VITE_API_URL` fallback.
- Auth guard/session behavior and routing shell.

## Mandatory Pair Rule

- Every UI-facing change must co-run `ui-ux-style-profile`.
- 320px checklist report is required before sign-off.

## Engineering Rules

- SOLID/OOP boundaries for components/hooks/services.
- Use shared style primitives first.
- Enforce size limits (500/250/300/60).

## Required Validation

- Frontend type/build checks.
- Frontend security remediation: `npm audit fix`.
- Playwright only when gate requires.
