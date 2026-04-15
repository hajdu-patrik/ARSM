---
name: autoservice-ef-migration
description: EF Core migration and PostgreSQL recovery runbook for AutoService (Windows + Aspire). Use this when asked to create/apply migrations, refresh schema, reset the database, inspect tables, or fix failing dotnet ef commands.
disable-model-invocation: true
---

Use this skill for EF Core migration workflows in this repository.

Slash entrypoint:
- Use `/ef-migration` to run the wrapper prompt that loads and applies this skill.

Repository context and defaults:
- Execute commands from app.
- EF project: AutoService.ApiService.
- EF startup project: AutoService.ApiService.
- Migration output directory: Data/Migrations.
- AppHost project: AutoService.AppHost.
- Database name: AutoServiceDb (PostgreSQL via Aspire).

Always follow this order:
1. Determine intent: schema-only update or full reset.
2. If AppHost/API may be running, stop them before dotnet ef commands.
3. Run the correct command set.
4. Verify schema state in PostgreSQL.
5. If command fails, use the troubleshooting matrix below.

Safety rule:
- Full reset is destructive. Ask for explicit confirmation before dropping the database.

## Preferred flow: schema-only update (preserve data)

```bash
# from app
dotnet ef migrations add <MigrationName> \
  --project AutoService.ApiService \
  --startup-project AutoService.ApiService \
  --output-dir Data/Migrations

dotnet ef database update \
  --project AutoService.ApiService \
  --startup-project AutoService.ApiService
```

Then run AppHost:

```bash
dotnet run --project AutoService.AppHost
```

## Full reset flow (drop DB, rebuild schema, reseed)

Option A: EF CLI

```bash
# from app
dotnet ef database drop --force --project AutoService.ApiService --startup-project AutoService.ApiService
dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService
dotnet run --project AutoService.AppHost
```

Option B: Docker drop (can be used while AppHost is running)

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
docker exec <CONTAINER_NAME> sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres -c "DROP DATABASE IF EXISTS \"AutoServiceDb\";"'
dotnet run --project AutoService.AppHost
```

## Windows lock fix before rerun

If dotnet ef fails with Build failed caused by file locks:

```bash
# stop AppHost/API first (Ctrl+C), then:
cmd.exe /c "taskkill /IM AutoService.ApiService.exe /F 2>nul"
cmd.exe /c "taskkill /IM dotnet.exe /F 2>nul"
```

After that, rerun the intended EF command.

## PostgreSQL schema inspection (psql)

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
docker exec -it <CONTAINER_NAME> sh
export PGPASSWORD=$POSTGRES_PASSWORD
psql -U postgres -d AutoServiceDb
```

Use these psql commands:

```sql
\dt
\d people
\d vehicles
\d appointments
\d appointmentmechanics
\d refreshtokens
\d "AspNetUsers"
\d "AspNetRoles"
\d "AspNetUserRoles"
\d "AspNetUserClaims"
\d "AspNetUserLogins"
\d "AspNetUserTokens"
\d "AspNetRoleClaims"
```

Data validation queries are in Test/PostgreSQLAccesValidation.sql.

Exit:
- \q (leave psql)
- exit (leave container shell)

## Troubleshooting matrix

- Symptom: Build failed with lock/file-in-use
  - Action: stop running processes using Ctrl+C and taskkill commands, then rerun.

- Symptom: No project was found or MSBuild cannot locate project
  - Action: run from app and keep --project and --startup-project as AutoService.ApiService.

- Symptom: Connection/authentication error to PostgreSQL
  - Action: verify AppHost is running, check container status with docker ps, and verify ConnectionStrings__AutoServiceDb or local config.

- Symptom: Migration generated but update fails on SQL step
  - Action: inspect generated migration in Data/Migrations, fix model/config mismatch, create a new correcting migration (do not rewrite already-shared migration history unless explicitly requested).

- Symptom: Schema seems outdated after update
  - Action: inspect with psql commands above and cross-check with Test/PostgreSQLAccesValidation.sql.

When unsure, prefer non-destructive schema update first, and only perform a full reset after explicit user confirmation.