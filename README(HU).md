# ARSM - Appointment and Resource Scheduling Management

![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

Az ARSM egy autószervizeknek készült műhelyütemező és napi működést támogató alkalmazás. Segít a szerelőknek és adminoknak az időpontok kezelésében, a munkák felvételében, és a javítási folyamat követésében egy reszponzív felületen.

## Nyelv

- Magyar: ez a fájl
- Angol: [README.md](README.md)

## Fő funkciók

- Időpontfelvétel és műhelyszintű ütemezés
- Szabad munkák felvétele és leadása szerelői oldalon
- Állapotfrissítés aktív munkákhoz
- Havi naptárnézet és kijelölt napi összegzés
- Szerepkör-alapú működés (szerelő és admin)

## Technológiai stack

| Réteg | Technológiák |
| ----- | ------------ |
| Backend | .NET 10, ASP.NET Core Web API, EF Core, ASP.NET Core Identity, JWT |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Adatbázis | PostgreSQL |
| Orkesztráció | .NET Aspire (`AutoService.AppHost`) |

## Repozitórium felépítése

- `app/AutoService.ApiService`: API endpointok, domain modell, EF Core, hitelesítés
- `app/AutoService.WebUI`: React frontend
- `app/AutoService.AppHost`: Aspire orkesztráció (PostgreSQL + ApiService + WebUI)
- `app/AutoService.ServiceDefaults`: közös service defaultok és resilience beállítások
- `tests/API`: HTTP endpoint tesztek (`.http`)
- `tests/Database`: SQL validációs lekérdezések (`.sql`, csak olvasási policy)
- `docs`: kiegészítő technikai és UI/UX dokumentáció

## Gyors indítás (ajánlott)

### Előfeltételek

- .NET 10 SDK
- Node.js 20+ és npm
- Futó Docker Desktop (az AppHost PostgreSQL konténert indít)

### 1) Lokális API beállítás létrehozása

A commitolt sablonból hozd létre a lokális, gitignored API konfigurációt:

```powershell
Copy-Item app/AutoService.ApiService/appsettings.Local.template.json app/AutoService.ApiService/appsettings.Local.json
```

vagy

```bash
cp app/AutoService.ApiService/appsettings.Local.template.json app/AutoService.ApiService/appsettings.Local.json
```

Ezután töltsd ki a helyőrző értékeket az `appsettings.Local.json` fájlban, különösen:

- `JwtSettings.Secret`
- `ConnectionStrings.AutoServiceDb`
- `DemoData.MechanicPassword`

### 2) Eszközök visszaállítása és frontend függőségek telepítése

```bash
dotnet tool restore --tool-manifest dotnet-tools.json
cd app/AutoService.WebUI
npm install
cd ../..
```

### 3) Teljes lokális stack indítása

```bash
cd app
dotnet run --project AutoService.AppHost
```

Az AppHost elindítja és összeköti:

- PostgreSQL
- `AutoService.ApiService`
- `AutoService.WebUI` fejlesztői szerver (`VITE_API_URL` automatikus injektálással)

## Hasznos parancsok

| Feladat | Parancs |
| ------- | ------- |
| AppHost build | `dotnet build app/AutoService.AppHost/AutoService.AppHost.csproj --verbosity minimal` |
| Frontend build | `cd app/AutoService.WebUI && npm run build` |
| Frontend lint | `cd app/AutoService.WebUI && npm run lint` |
| Frontend E2E futtatás | `cd app/AutoService.WebUI && npm run e2e` |

## Konfiguráció és titokkezelés

- Titkokat, jelszavakat, lokális connection stringeket ne commitolj.
- Backend lokális titkok: `app/AutoService.ApiService/appsettings.Local.json` (gitignored).
- API teszt futtatási értékek: `tests/.env` (sablon: `tests/.env.example`).
- Playwright futtatási titkok: repo gyökérbeli `.secrets` (gitignored).

## Fejlesztői megjegyzések (AI workflow)

- Implementációnál kötelező az orchestrator-first megközelítés, majd specialista routing.
- Frontend implementáció csak a `ui-ux-style-profile` párossal érvényes.
- Implementáció után kötelező a build validáció és dokumentáció-szinkron.
- Kódváltozásnál kötelező security remediation (`npm audit fix` WebUI-n, sérülékeny csomagellenőrzés .NET oldalon).
- Részletes policy fájlok:
  - Gyökér: `CLAUDE.md`, `.github/copilot-instructions.md`
  - Területi szabályok: `app/*/CLAUDE.md`, `.github/instructions/*.instructions.md`

## SQL csak olvasható policy MI validációhoz

- Dedikált AI SQL felhasználó: `ai_agent_test_user`
- Engedélyezett SQL: `SELECT`
- Tiltott AI toolingból: `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`

## Licenc

Ez a repository nem MIT licencű.

Részletek: [LICENSE.md](LICENSE.md) (Custom Copyright Notice and Academic Use Policy).