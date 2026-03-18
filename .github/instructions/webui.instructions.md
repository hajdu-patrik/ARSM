---
applyTo: "AutoServiceApp/AutoService.WebUI/**"
description: "Use when editing React frontend, API integration, routing, and UI state in AutoService.WebUI."
---
# AutoService.WebUI Instructions

- Use React function components with strict TypeScript.
- Keep API calling logic in src/services and keep components focused on UI/state.
- Read backend base URL from VITE_API_URL (import.meta.env), do not hardcode API origins.
- Keep styles in Tailwind utility classes; avoid unnecessary custom CSS.
- Keep layouts responsive for desktop and mobile.
- If auth is implemented, store and attach JWT safely (avoid leaking secrets in logs).
- Align request/response models with backend contracts.
- Keep forms and validation messages explicit and user-friendly.
