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
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
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
- Python 3.11+ a lokális tesztfuttatóhoz
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
| Összes lokális teszt futtatása | `python scripts/run-local-test-suite.py` |
| Kiválasztott lokális tesztek futtatása | `python scripts/run-local-test-suite.py playwright http sql` |

A NuGet restore lock-file alapú: az `app/Directory.Build.props` bekapcsolja a locked restore-t, az AppHost Linux és macOS alatt RID-specifikus lock fájlokat használ az Aspire Dashboard/DCP csomagokhoz, a CI pedig `dotnet restore --locked-mode` módban fut.

## Tesztek futtatása

A Python futtatót a repository gyökeréből indítsd. Betölti a `.secrets` és `tests/.env` fájlokat, lefuttatja a kért suite-okat, és maszkolt összefoglalót ír ide: `tests/.artifacts/test-suite-summary.json`.
Minden alparancs alapértelmezett timeoutja 300 másodperc; lassabb lokális futtatáshoz az `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` állítható.

```bash
python scripts/run-local-test-suite.py
```

Egy vagy több suite külön is futtatható:

```bash
python scripts/run-local-test-suite.py playwright
python scripts/run-local-test-suite.py http sql
```

Suite célok:

- `playwright`: futtatja a WebUI Playwright E2E suite-ot (`PORT=5173` alapérték).
- `http`: futtatja az összes `tests/API/**/*.http` suite-ot HTTPYAC-kel.
- `sql`: futtatja az összes `tests/Database/**/*.sql` fájlt a futó PostgreSQL konténeren, read-only SQL felhasználóval.

Teljes suite futtatás előtt indítsd el az Aspire stacket egy másik terminálban:

```bash
cd app
dotnet run --project AutoService.AppHost
```

A `tests/.artifacts/` alatti generált riportok gitignore alatt vannak, és lokális hibakereséshez/AI review-hoz csak maszkolt összefoglalóként szolgálnak.

### AI teszt workflow

Teljes tesztvizsgálatnál az AI agent ezt futtassa:

```bash
python scripts/run-local-test-suite.py
```

Ezután a `tests/.artifacts/test-suite-summary.json` fájlt vizsgálja, és a megfelelő rétegben lépjen tovább (hiányzó teszt, elavult teszt, hibás viselkedés vizsgálata). Agent nem publikálhat nyers `.env` értékeket, `.secrets` tartalmat, connection stringet, cookie-t, tokent, abszolút lokális útvonalat vagy nyers tool logot.

## Konfiguráció és titokkezelés

- Titkokat, jelszavakat, lokális connection stringeket ne commitolj.
- Backend lokális titkok: `app/AutoService.ApiService/appsettings.Local.json` (gitignored).
- Frontend lokális env értékek: `app/AutoService.WebUI/.env.development` (sablon: `app/AutoService.WebUI/.env.development.template`).
- API teszt futtatási értékek: `tests/.env` (sablon: `tests/.env.example`).
  - Az `ARSM_TEST_WEBUI_ORIGIN` értékének egyeznie kell egy `Cors:AllowedOrigins` beállítással, mert a cookie-alapú unsafe HTTP tesztek `Origin` fejlécet küldenek.
- Playwright futtatási titkok: repo gyökérbeli `.secrets` (gitignored); lokális E2E futtatásnál a nem titkos `PORT=5173` is szükséges a Vite serve mód miatt.
- MCP lokális runtime configok: `.claude/.mcp.json` és `.vscode/mcp.json` (mindkettő gitignored), a `.claude/.mcp.template.json` és `.vscode/mcp.template.json` sablonokból.
- Az MCP sablonokban az `ARSM_MCP_POSTGRES_CONNECTION_STRING` marad a hordozható placeholder; a gitignore-olt lokális MCP profilok tartalmazhatják az `ai_agent_test_user` konkrét read-only PostgreSQL URI-ját.

## Deployment biztonsági megjegyzések

- A Vite/Aspire WebUI hosting csak lokális fejlesztésre szolgál. A Vite dev szerver alapból `localhost` címre bindol; `VITE_DEV_HOST` csak tudatos lokális LAN/konténeres hibakeresési opt-in legyen.
- Production API hostingnál az `AllowedHosts` és `Cors:AllowedOrigins` valós, nem localhost hostokra legyen állítva. Non-Development induláskor a wildcard, localhost, nem HTTPS, hibás vagy path-ot tartalmazó WebUI origin elutasításra kerül.
- Az auth login/refresh rate limit és login ban állapot processzen belüli. Non-Development deploymentben a `Deployment:RateLimiterTopology=SingleInstance` csak akkor állítható be, ha pontosan egy ApiService példány fut; skálázás előtt distributed limiter kell.
- A production WebUI static hostnak vagy reverse proxy-nak kell érvényesítenie a biztonsági fejléceket, mert a Vite nem release szerver. Kötelező fejlécek: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` vagy ezzel egyenértékű frame protection, és `Strict-Transport-Security`, ha ott terminálódik a TLS.
- A production WebUI static hostnak cache fejléceket is érvényesítenie kell. Nginx referenciaként használd ezt: [docs/deployment/nginx-webui-cache.conf](docs/deployment/nginx-webui-cache.conf). Az `index.html` nem cache-elődik, a Vite `assets/` fájlok 30 napos `immutable` cache-t kapnak, a public képek/ikonok 30 napos cache-t és ETag revalidációt kapnak, a manifest/sitemap/robots jellegű fájlok pedig rövidebb, egynapos cache-t használnak.

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
