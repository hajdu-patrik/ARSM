---
name: autoservice-docs-sync
description: Synchronize all CLAUDE.md and .github/instructions files with the actual codebase state. Use after adding endpoints, migrations, components, dependencies, middleware, or config changes.
---

Use this skill to bring all project documentation files in sync with the current code.

Slash entrypoint:
- Use `/docs-sync` to run the full synchronization workflow.

## Files to synchronize

Each CLAUDE.md has a corresponding .github counterpart. Both must reflect the same truth:

| CLAUDE.md | .github counterpart |
|-----------|---------------------|
| `CLAUDE.md` (root) | `.github/copilot-instructions.md` |
| `AutoServiceApp/AutoService.ApiService/CLAUDE.md` | `.github/instructions/apiservice.instructions.md` |
| `AutoServiceApp/AutoService.WebUI/CLAUDE.md` | `.github/instructions/webui.instructions.md` |
| `AutoServiceApp/AutoService.AppHost/CLAUDE.md` | `.github/instructions/apphost.instructions.md` |
| `AutoServiceApp/AutoService.ServiceDefaults/CLAUDE.md` | `.github/instructions/servicedefaults.instructions.md` |

## Analysis workflow

For each project, gather the current state by reading source files. Do NOT guess — read the actual code.

### ApiService — check these:
1. **Endpoints**: Read `Auth/AuthEndpointMapper.cs` (or equivalent mapper) for all mapped routes.
2. **Migrations**: List files in `Data/Migrations/` (exclude `.Designer.cs` and snapshot).
3. **Middleware pipeline**: Read `Program.cs` for the exact middleware order after `app.Build()`.
4. **Services registered**: Read `Program.cs` for all `builder.Services.Add*` calls.
5. **Packages**: Read `AutoService.ApiService.csproj` for all `<PackageReference>` entries.
6. **Configuration keys**: Read `appsettings.json` and scan `Program.cs`/auth files for `Configuration[...]` reads.
7. **Domain model**: Read `Data/AutoServiceDbContext.cs` for DbSets, entity configs, owned types.
8. **DTOs/Contracts**: Scan `Auth/` and `Contracts/` for record/class definitions used at API boundaries.

### WebUI — check these:
1. **Pages**: List all files in `src/pages/`.
2. **Components**: List all files in `src/components/`.
3. **Stores**: Read all files in `src/store/`.
4. **Services**: Read all files in `src/services/`.
5. **Types**: Read `src/types/types.ts`.
6. **Routes**: Read `src/App.tsx` for route definitions.
7. **Vite config**: Read `vite.config.ts` for plugins, server settings.
8. **Dependencies**: Read `package.json` for runtime and dev dependencies.
9. **i18n**: Read `src/utils/i18n.ts` for translation keys and supported languages.
10. **SEO behavior**: Read `src/components/seo/SeoManager.tsx` and verify title/meta/canonical behavior.
11. **Sidebar behavior**: Read `src/components/layout/SidebarLayout.tsx` for collapse persistence, mobile drawer, and profile footer behavior.
12. **Icon usage**: Scan `src/**` for `lucide-react` usage and inline `<svg` markup; document the exact current state without guessing.

### AppHost — check these:
1. **Resources**: Read `AppHost.cs` for all `builder.Add*` calls and wiring.
2. **Configuration**: Read `appsettings.json` for port and config keys.
3. **Packages**: Read `AutoService.AppHost.csproj`.
4. **Parameters/secrets**: Read `AppHost.cs` for `builder.AddParameter(...)` calls.

### ServiceDefaults — check these:
1. **Extension methods**: Read `Extensions.cs` for public method signatures.
2. **Packages**: Read `AutoService.ServiceDefaults.csproj`.
3. **Health endpoints**: Read `Extensions.cs` for mapped paths.

## Comparison rules

For each section in each doc file, compare the documented state against the analyzed state:

- **Endpoints**: Every mapped endpoint must be listed. Remove endpoints that no longer exist.
- **Migrations**: The migration list must match exactly what exists in `Data/Migrations/`.
- **Middleware order**: Must reflect the actual call order in `Program.cs`.
- **Components/Pages**: Every file in the component/page directories must be listed.
- **Dependencies**: Key runtime dependencies must be listed. Dev-only tooling can be omitted.
- **Configuration keys**: All keys read at runtime must be documented.
- **Security settings**: Lockout thresholds, rate limits, token lifetimes, cookie settings must match code.

## Update rules

- Update both the CLAUDE.md and its .github counterpart in the same pass.
- Keep the existing structure/heading style of each file — do not restructure.
- Only change sections where the content is actually outdated.
- Do not add speculative content — only document what exists in the code.
- Keep the `.github/copilot-instructions.md` "Current Known Gaps" section accurate.
- Keep the `.github/copilot-instructions.md` "Current API & Security Snapshot" section accurate.
- If root `README.md` or `README(HU).md` contains stale project-state claims, update both consistently.
- For touched markdown files, fix basic quality issues (heading spacing, table separators, trailing newline) without changing meaning.
- After all edits, report a summary of what changed and in which files.

## Validation checklist

After updates, confirm:
- [ ] Every mapped API endpoint appears in ApiService docs and copilot-instructions snapshot.
- [ ] Migration list matches `Data/Migrations/` directory.
- [ ] Middleware order matches `Program.cs` pipeline.
- [ ] All WebUI pages/components/stores/services are listed.
- [ ] Key dependencies match `package.json` and `.csproj` files.
- [ ] AppHost resource wiring matches `AppHost.cs`.
- [ ] CLAUDE.md and .github counterpart agree on all facts.
- [ ] WebUI SEO documentation states the current `SeoManager` title/meta behavior.
- [ ] Sidebar and icon behavior documentation reflects current implementation.
