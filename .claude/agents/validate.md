---
name: validate
description: "Build/type/security validation gate with required vulnerability remediation on code-change workflows."
model: haiku
tools: Read, Edit, Grep, Glob, Bash
---

# Build Validator Agent

## Required Stages

1. Backend build (`dotnet build` from `app`) when backend touched.
2. Frontend type/build checks when frontend touched.
3. Quality gate review on changed files (SOLID/OOP/GoF and size guardrails).
4. Security remediation:
   - frontend -> `npm audit fix`
   - backend -> `dotnet list package --vulnerable --include-transitive`

## Output

- PASS/FAIL per stage.
- Remediations applied.
- Remaining blockers.
