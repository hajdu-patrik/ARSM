# AutoService Copilot Instructions (Project-Specific)

## Goal
This repository hosts the AutoService full-stack application.

Prioritize maintainable, domain-safe, incremental changes that align with the existing architecture and folder layout.

## Technology Baseline
- Backend: .NET 10 (C# 15) ASP.NET Core Web API + Entity Framework Core.
- Frontend: React 19 + TypeScript + Vite.
- Styling: Tailwind CSS only.
- Orchestration: .NET Aspire (`AutoService.AppHost` + `AutoService.ServiceDefaults`).
- Database target: PostgreSQL via Aspire orchestration.

## Repository Map
- `AutoServiceApp/AutoService.ApiService`: API, domain model, EF Core context and migrations.
- `AutoServiceApp/AutoService.AppHost`: Aspire orchestration entry point.
- `AutoServiceApp/AutoService.ServiceDefaults`: shared defaults and cross-service settings.
- `AutoServiceApp/AutoService.WebUI`: React client.

## Backend Non-Negotiables
- Keep `People` inheritance as TPH (Table-Per-Hierarchy) at all times.
- Keep `People` as abstract base and keep `Customer` + `Mechanic` as derived entities.
- Keep one `people` table with discriminator; do not switch to TPT or TPC.
- Preserve `FullName` as an owned value object mapping on `People`.
- Preserve mechanic expertise rules:
	- expertise list must contain 1..10 items,
	- items must be unique,
	- persisted expertise must never be empty.
- Preserve core relationships:
	- `Customer` 1..* `Vehicle`,
	- `Vehicle` 1..* `Appointment`,
	- `Appointment` *..* `Mechanic` (join table).
- Do not expose EF entities directly from API boundaries; use DTO contracts.

## EF Core and Data Rules
- The EF Core provider is `Npgsql.EntityFrameworkCore.PostgreSQL`; use `options.UseNpgsql(...)` in `Program.cs`.
- Keep model configuration centralized in `Data/AutoServiceDbContext.cs`.
- Place new migrations in `Data/Migrations`.
- Prefer async EF methods for I/O (`SaveChangesAsync`, `ToListAsync`, etc.).
- Keep schema constraints and indexes aligned with domain invariants.
- Use `ConnectionStrings:AutoServiceDb` as the canonical connection key.
- Never hardcode credentials in committed source code.
- Prefer Aspire-injected configuration, environment variables, and gitignored local overrides.
- Local standalone run (outside AppHost): provide the PostgreSQL connection string in `appsettings.Local.json` (gitignored) or via the `ConnectionStrings__AutoServiceDb` environment variable.

## API Implementation Rules
- Keep `Program.cs` focused on service registration, middleware, and endpoint mapping.
- Place cross-cutting logic in dedicated files/folders (for example `Auth`, `Contracts`, extensions).
- Use cancellation tokens for async flows where applicable.
- Return accurate HTTP status codes and explicit validation errors.
- Keep comments concise and only for non-obvious logic.

## Aspire Rules
- `AutoService.AppHost` is the default local entry point.
- Wire dependencies using `WithReference(...)` and startup ordering with `WaitFor(...)` when needed.
- Frontend must use `VITE_API_URL` provided by AppHost instead of hardcoded API endpoints.
- Keep infrastructure resource names stable and deterministic when adding new resources.

## Frontend Rules
- Use React function components and strict TypeScript.
- Never suggest Next.js or server-side rendering patterns.
- Use Tailwind utility classes for styling; avoid new custom CSS unless necessary.
- Use pastel purple as the primary accent color for new UI work.
- Ensure layouts are responsive on desktop and mobile.
- Keep API access logic in `src/services` and keep components focused on UI/state.

## Code Change Policy for Copilot
- Make minimal, task-focused changes; avoid broad refactors unless requested.
- Preserve existing behavior unless the task explicitly asks for behavior changes.
- For backend changes, validate with `dotnet build` from `AutoServiceApp`.
- For frontend changes, validate with `npm run build` from `AutoService.WebUI` when relevant.
- If task requirements conflict with current implementation, follow this file and call out the conflict clearly.

## Preferred Commands
From `AutoServiceApp` root:
- `dotnet build`
- `dotnet run --project AutoService.AppHost`
- `dotnet ef migrations add <Name> --project AutoService.ApiService --startup-project AutoService.ApiService --output-dir Data/Migrations`
- `dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService`

From `AutoServiceApp/AutoService.WebUI`:
- `npm install`
- `npm run dev`
- `npm run build`