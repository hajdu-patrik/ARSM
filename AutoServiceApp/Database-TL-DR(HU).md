# PostgreSQL gyors ellenőrzés (Aspire)

Ez az útmutató megmutatja, hogyan tudod ellenőrizni:
- milyen táblák léteznek,
- mi az egyes táblák sémája,
- és hogyan kérhetsz le darabszámokat.

---

## Nyelv

- Magyar: ez a fájl
- Angol: [Database-TL-DR.md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/AutoServiceApp/Database-TL-DR.md)

---

## Adatbázis frissítési módok Entity Framework Core használatával

### Fontos EF parancsok előtt (gyakori Windows lock hiba)

Ha a `dotnet ef ...` parancsok `Build failed` hibával állnak meg, és azt látod, hogy egy fájlt másik folyamat használ:

```bash
# Először állítsd le a futó Aspire/API terminált (Ctrl+C)
# Ezután zárd be a beragadt folyamatokat
cmd.exe /c "taskkill /IM AutoService.ApiService.exe /F 2>nul"
cmd.exe /c "taskkill /IM dotnet.exe /F 2>nul"
```

Utána futtasd újra az EF parancsokat.

### Teljes újraépítés

Ezt akkor használd, ha mindent újra akarsz rakni.

```bash
# AutoServiceApp root mappából
# Ez törli a jelenlegi adatbázist és minden adatot
dotnet ef database drop --force --project AutoService.ApiService --startup-project AutoService.ApiService
```

```bash
# Ez létrehozza az adatbázist és alkalmazza a jelenlegi sémát
dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService
```

```bash
# Ez elindítja a stack-et, és a seed/initializer logika újratöltheti az adatokat
dotnet run --project AutoService.AppHost
```

### Csak sémafrissítés

```bash
# Ez létrehoz egy új migrációt a modellváltozások alapján
dotnet ef migrations add <MigrationName> --project AutoService.ApiService --startup-project AutoService.ApiService --output-dir Data/Migrations
```

```bash
# Ez alkalmazza a függőben lévő migrációkat az adatbázisra, az adatok megőrzésével, ha lehetséges
dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService
```

---

## Keresd meg a PostgreSQL konténer nevét

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

A `postgres:17.6` image sorából a `NAMES` oszlop értéke kell (például `postgres-xxxxx`).

---

## Lépj be a konténerbe és a psql kliensbe

```bash
docker exec -it <KONTÉNER_NÉV> sh
export PGPASSWORD=$POSTGRES_PASSWORD
psql -U postgres -d AutoServiceDb
```

---

## Táblák listázása

```sql
\dt
```

---

## Tábla séma megtekintése

```sql
\d "People"
\d "Vehicles"
\d "Appointments"
\d "AppointmentMechanics"
```

---

## Példa sorok lekérése

```sql
SELECT * FROM "People" LIMIT 20;
SELECT * FROM "Vehicles" LIMIT 20;
```

---

## Darabszám lekérés táblánként

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

## Teljes oszlopszintű séma lekérése

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

## Kilépés

- `psql` bezárása: `\q`
- Konténer shell bezárása: `exit`
