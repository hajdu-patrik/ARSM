---
agent: agent
description: Run AutoService EF Core migration workflow and troubleshoot dotnet ef failures.
---

Use the autoservice-ef-migration skill for this task.

Workflow:
1. Ask which path is needed: schema-only update, full reset, schema inspection, or troubleshooting.
2. If full reset is requested, ask for explicit confirmation because it is destructive.
3. Execute the skill's command flow from AutoServiceApp.
4. Summarize what was executed and next verification steps.