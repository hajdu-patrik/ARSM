# PostgreSQL Quick Check (Aspire)

This guide shows how to verify:
- which tables exist,
- what schema each table has,
- and how to query row counts.

---

## Language

- English: this file
- Hungarian: [Database-TL-DR(HU).md]()


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

```bash
# from AutoServiceApp root
# This deletes the current database and all data
dotnet ef database drop --force --project AutoService.ApiService --startup-project AutoService.ApiService
```

```bash
# This creates the database and applies the current schema
dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService
```

```bash
# This starts the stack, and the seed/initializer logic can reload data
dotnet run --project AutoService.AppHost
```

### Schema-only refresh

```bash
# This creates a new migration based on model changes
dotnet ef migrations add <MigrationName> --project AutoService.ApiService --startup-project AutoService.ApiService --output-dir Data/Migrations
```

```bash
# This applies pending migrations to the database, keeping data when possible
dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService
```

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
\d "People"
\d "Vehicles"
\d "Appointments"
\d "AppointmentMechanics"
```

---

## Query sample rows

```sql
SELECT * FROM "People" LIMIT 20;
SELECT * FROM "Vehicles" LIMIT 20;
```

---

## Row counts by table

```sql
SELECT 'People' AS table_name, COUNT(*) AS row_count FROM "People"
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM "Vehicles"
UNION ALL
SELECT 'Appointments', COUNT(*) FROM "Appointments"
UNION ALL
SELECT 'AppointmentMechanics', COUNT(*) FROM "AppointmentMechanics";
```

---

## Full column-level schema overview

```sql
SELECT
	table_name,
	column_name,
	data_type,
	is_nullable,
	column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

---

## Exit commands

- Exit `psql`: `\q`
- Exit container shell: `exit`