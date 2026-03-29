---
name: autoservice-config-driven-endpoints
description: Enforce config-driven URLs/ports and no-hardcoded endpoint policy in AutoService. Use this when adding or modifying services, ports, URLs, env variables, AppHost wiring, vite config, launch settings, or API base URL behavior.
---

Use this skill whenever endpoint/port/address changes are involved.

Objective:
- Keep all service URLs and ports fixed in configuration files.
- Avoid hardcoded runtime fallback URLs in source code.
- Keep Aspire wiring as the source of truth for cross-service communication.

Repository policy:
- AppHost config source: AutoServiceApp/AutoService.AppHost/appsettings.json (Ports section).
- API local URL source: AutoServiceApp/AutoService.ApiService/Properties/launchSettings.json.
- WebUI local source: AutoServiceApp/AutoService.WebUI/.env.development.
- API client must require VITE_API_URL from environment; do not add hardcoded fallback.
- vite serve mode must read PORT from environment and use strictPort true.

Required checks before edits:
1. Identify whether this is a new service or a modification of an existing one.
2. Identify all impacted config files (AppHost, launchSettings, .env, and service code).
3. Confirm there is no existing hardcoded URL fallback that would conflict.

Implementation workflow:
1. Add or update port keys in AppHost appsettings.json (single source of truth).
2. Keep API launch URL explicit in launchSettings.json.
3. Set/update WebUI env values in .env.development.
4. Ensure AppHost injects required endpoint env vars (for example VITE_API_URL).
5. Update client/service code to read env-driven values only.
6. Verify no hardcoded URL fallback remains.

Validation checklist:
- No new localhost URL literals were introduced in client runtime fallback logic.
- VITE_API_URL is read from environment and required.
- PORT is read from environment in vite config for serve mode.
- AppHost, API, and WebUI settings agree on ports and protocol.
- Existing behavior remains stable after config change.

If a user requests a hardcoded shortcut:
- Explain the repository policy briefly.
- Implement the equivalent config-driven change instead.

When uncertain:
- Prefer minimal, additive config changes.
- Do not rename existing config keys unless explicitly requested.