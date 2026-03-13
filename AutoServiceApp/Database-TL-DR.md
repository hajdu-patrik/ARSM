# PostgreSQL Quick Check (Aspire)

This guide shows how to verify:
- which tables exist,
- what schema each table has,
- and how to query row counts.

---

## Language

- English: this file
- Hungarian: [Database-TL-DR(HU).md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/AutoServiceApp/Database-TL-DR(HU).md)


---

## Database update via Entity Framework Core

### Important before running EF commands (common lock issue on Windows)

If `dotnet ef ...` fails with `Build failed` and lock errors such as `file is being used by another process`:

```bash
# Stop any running Aspire/API terminal first (Ctrl+C)
# Then force-kill stale processes that lock build outputs
cmd.exe /c "taskkill /IM AutoService.ApiService.exe /F 2>nul"
cmd.exe /c "taskkill /IM dotnet.exe /F 2>nul"
```

Then run EF commands again.

### Full reset (delete current data, recreate schema, reload fresh content)

**Option A — via EF CLI** (works when Aspire is stopped and port 55432 is reachable)

```bash
# from AutoServiceApp root
# Stop AppHost first (Ctrl+C), then:
dotnet ef database drop --force --project AutoService.ApiService --startup-project AutoService.ApiService
dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService
dotnet run --project AutoService.AppHost
```

**Option B — via Docker** (works even while AppHost is running; more reliable on Windows)

```bash
# 1. Find the container name
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"

# 2. Drop the database inside the container
docker exec <CONTAINER_NAME> sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres -c "DROP DATABASE IF EXISTS \"AutoServiceDb\";"'

# 3. Restart AppHost — MigrateAsync() will recreate the schema and reseed
dotnet run --project AutoService.AppHost
```

The `DemoDataInitializer.EnsureSeededAsync()` runs automatically on startup: it calls `MigrateAsync()` (creates the schema) and inserts all demo data when the tables are empty.

### Schema-only refresh (add a new migration without touching data)

```bash
# 1. Stop AppHost (Ctrl+C) to release build file locks

# 2. Kill any stale dotnet processes if still locked
cmd.exe /c "taskkill /IM AutoService.ApiService.exe /F 2>nul"
cmd.exe /c "taskkill /IM dotnet.exe /F 2>nul"

# 3. Create a new migration for your model changes
#    Replace <MigrationName> with a descriptive PascalCase name, e.g. AddVehicleColor
dotnet ef migrations add <MigrationName> \
  --project AutoService.ApiService \
  --startup-project AutoService.ApiService \
  --output-dir Data/Migrations

# 4. Apply the migration (data is preserved)
dotnet ef database update \
  --project AutoService.ApiService \
  --startup-project AutoService.ApiService

# 5. Restart AppHost
dotnet run --project AutoService.AppHost
```

> **Tip:** migration files are generated under `AutoService.ApiService/Data/Migrations/`. Always review the generated `Up()` / `Down()` methods before applying.

---

## Find the PostgreSQL container name

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

Use the row with image `postgres:17.6` and copy the value from the `NAMES` column (for example `postgres-xxxxx`).

---

## Open psql inside the container

```bash
docker exec -it <CONTAINER_NAME> sh
export PGPASSWORD=$POSTGRES_PASSWORD
psql -U postgres -d AutoServiceDb
```

---

## List tables

```sql
\dt
```

---

## Show table schema

```sql
\d people
\d vehicles
\d appointments
\d appointmentmechanics
```

ASP.NET Core Identity tables (added by the `AddIdentityAndIdentityUserId` migration):

```sql
\d "AspNetUsers"
\d "AspNetRoles"
\d "AspNetUserRoles"
\d "AspNetUserClaims"
\d "AspNetUserLogins"
\d "AspNetUserTokens"
\d "AspNetRoleClaims"
```

---

## Data verification queries

Use on the root level: Test/PostgreSQLAccesValidation.sql file contains example queries to check if the expected data is present in the database. You can copy-paste these into the `psql` terminal.

---

## Exit commands

- Exit `psql`: `\q`
- Exit container shell: `exit`
