---
agent: agent
description: Apply AutoService config-driven endpoint and port policy (no hardcoded URL fallbacks).
---

Use the autoservice-config-driven-endpoints skill for this task.

Workflow:
1. Determine if this is a new service addition or existing service update.
2. Identify impacted files in AppHost, API launch settings, WebUI env, and runtime client config.
3. Apply config-first changes and remove/avoid hardcoded URL fallback logic.
4. Summarize the exact config keys and files changed.