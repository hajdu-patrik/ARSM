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

**A lehetőség — EF CLI-vel** (akkor működik, ha az AppHost le van állítva és az 55432-es port elérhető)

```bash
# AutoServiceApp root mappából
# Állítsd le az AppHost-ot (Ctrl+C), majd:
dotnet ef database drop --force --project AutoService.ApiService --startup-project AutoService.ApiService
dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService
dotnet run --project AutoService.AppHost
```

**B lehetőség — Docker-en keresztül** (AppHost futása közben is működik; Windows-on megbízhatóbb)

```bash
# 1. Keresd meg a konténer nevét
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"

# 2. Töröld az adatbázist a konténerben
docker exec <KONTÉNER_NÉV> sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres -c "DROP DATABASE IF EXISTS \"AutoServiceDb\";"'

# 3. Indítsd újra az AppHost-ot — a MigrateAsync() újra létrehozza a sémát és betölti a demo adatokat
dotnet run --project AutoService.AppHost
```

A `DemoDataInitializer.EnsureSeededAsync()` automatikusan fut induláskor: meghívja a `MigrateAsync()`-t (létrehozza a sémát) és beilleszt minden demo adatot, ha a táblák üresek.

### Csak sémafrissítés (új migráció az adatok megőrzésével)

```bash
# 1. Állítsd le az AppHost-ot (Ctrl+C) a build lock felszabadításához

# 2. Ha még mindig be van ragadva, zárd be a folyamatokat
cmd.exe /c "taskkill /IM AutoService.ApiService.exe /F 2>nul"
cmd.exe /c "taskkill /IM dotnet.exe /F 2>nul"

# 3. Hozz létre új migrációt a modell változásokhoz
#    Cseréld ki a <MigrationName>-t egy leíró PascalCase névre, pl. AddVehicleColor
dotnet ef migrations add <MigrationName> \
  --project AutoService.ApiService \
  --startup-project AutoService.ApiService \
  --output-dir Data/Migrations

# 4. Alkalmazza a migrációt (az adatok megmaradnak)
dotnet ef database update \
  --project AutoService.ApiService \
  --startup-project AutoService.ApiService

# 5. Indítsd újra az AppHost-ot
dotnet run --project AutoService.AppHost
```

> **Tipp:** a migrációs fájlok az `AutoService.ApiService/Data/Migrations/` mappában jönnek létre. Az alkalmazás előtt mindig nézd át a generált `Up()` / `Down()` metódusokat.

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
\d people
\d vehicles
\d appointments
\d appointmentmechanics
```

ASP.NET Core Identity táblák (az `AddIdentityAndIdentityUserId` migráció hozza létre):

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

## Adat ellenőrző lekérdezések

Használd a root szinten: Test/PostgreSQLAccesValidation.sql fájl tartalmazza azokat a lekérdezéseket, amelyekkel ellenőrizheted, hogy az elvárt adatok jelennek-e meg az adatbázisban. Másolhatod őket a `psql` terminálba.

---

## Kilépés

- `psql` bezárása: `\q`
- Konténer shell bezárása: `exit`
