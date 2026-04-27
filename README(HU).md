![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

# ARSM - Appointment and Resource Scheduling Management

Az **ARSM** egy szerelőknek készült műhelykezelő eszköz autószerviz vállalkozások számára. Segíti a szerelőket a napi javítási ütemtervek áttekintésében, időpontok igénylésében és a munkák állapotának valós idejű követésében egy letisztult, reszponzív felületen.

**Használd az ARSM-et, ha:**

- Egy pillantással szeretnéd áttekinteni és kezelni a javítási időpontokat
- Szabad időpontokat szeretnél igényelni és valós időben frissíteni az állapotukat
- Havi naptárnézetben szeretnéd böngészni az összes ütemezett munkát
- Szerelői munkaterheléseket szeretnél koordinálni a műhelyen belül

Full-stack alkalmazásként épült ASP.NET Core Web API (backend), React + TypeScript (frontend) és PostgreSQL (adatbázis) technológiákkal, .NET Aspire orkesztrációval az egyszerű helyi fejlesztésért.

---

## Nyelv

- Magyar: ez a fájl
- Angol: [README.md](https://github.com/hajdu-patrik/ARSM/blob/main/README.md)

---

## MI-alapú fejlesztés

A projekt két ágensi MI-eszközt használ párhuzamosan: **Claude Code** (CLI/desktop) és **GitHub Copilot** (VS Code). Mindkettő azonos utasításkészlettel és specialista ágensekkel dolgozik, így bármelyik eszköz képes a kódolás bármely részén dolgozni ugyanazokkal a szabályokkal.

### Specialista ágensek

Minden implementációs feladatot az orkesztrátor delegál specialista ágenseknek. Az orkesztrátor elemzi a kérést, fázisokra bontott tervet készít, és a megfelelő specialistákhoz irányítja a munkát, amelyek párhuzamosan is futhatnak, ha függetlenek.

| Ágens | Hatókör | Cél |
| ----- | ------- | --- |
| **Orkesztrátor** | Feladat-dekompozíció | Minden feladatot először elemez, eldönti, melyik specialista melyik fázisban dolgozik |
| **Backend** | `AutoService.ApiService` | Endpointok, domain modell, DTO-k, auth, middleware, EF lekérdezések |
| **Frontend** | `AutoService.WebUI` | Komponensek, oldalak, store-ok, szolgáltatások, i18n, routing, stílusok |
| **Migráció** | EF Core | Adatbázis-migrációk létrehozása, validálása és hibaelhárítása |
| **Docs Sync** | Dokumentáció | Minden utasításfájl szinkronizálása a kóddal minden változás után |
| **Coding Principles** | Kódminőség & stílus | JSDoc kommentek, elnevezési konvenciók és kódminőség kikényszerítése |
| **HTTP Endpoint Test** | .http tesztfájlok | HTTP endpoint tesztcsomagok frissítése API-változások után |
| **SQL Database Test** | .sql validációs fájlok | SQL validációs lekérdezések frissítése séma változások után |
| **E2E Playwright** | Playwright E2E tesztek | Playwright tesztcsomagok karbantartása, page objectek frissítése UI-változásokkor |
| **Validáló** | Build ellenőrzés | `dotnet build` + `npx tsc --noEmit` futtatása és eredmény jelentése |

**Standard workflow:**

1. Orkesztrátor fázisokra bontja a feladatot
2. Backend + Frontend specialisták párhuzamosan dolgoznak
3. Validáló ágens ellenőrzi a buildet
4. Docs Sync ágens szinkronizálja a dokumentációt
5. Coding Principles ágens ellenőrzi a kódminőséget és stílust
6. HTTP Endpoint Test ágens szinkronizálja a .http teszteket
7. SQL Database Test ágens szinkronizálja a .sql validációkat
8. E2E Playwright ágens frissíti a Playwright teszteket, amikor UI vagy DTO változik

Ágensdefiníciók:

- Claude Code: `.claude/agents/*.md`
- GitHub Copilot: `.github/agents/*.agent.md`

### Skillek (agens runbookok)

Újrahasználható runbookok, specialista ágensek használják. Az ágensek az elsődleges interfész — ágenseket hívj, ne közvetlenül skilleket.

| Skill | Ágens | Cél |
| ----- | ----- | --- |
| `autoservice-docs-sync` | `docs-sync` | Összes CLAUDE.md, .github/instructions és ARSM-TL-DR.md szinkronizálása a kóddal |
| `autoservice-coding-principles` | `coding-principles` | JSDoc kommentek, elnevezési konvenciók és kódminőség kikényszerítése |
| `autoservice-http-endpoint-test` | `http-endpoint-test` | .http tesztcsomagok frissítése endpoint változások után |
| `autoservice-sql-database-test` | `sql-database-test` | .sql validációs lekérdezések frissítése séma változások után |
| `autoservice-ef-migration` | `migration` | EF Core migrációs workflow és hibaelhárítás |
| `autoservice-e2e-playwright` | `e2e-playwright` | Playwright E2E tesztek frissítése UI/DTO változások után |

Skill források: `.github/skills/*/SKILL.md`

### SQL csak olvasható policy (MI)

- MI-alapú SQL validációhoz a dedikált PostgreSQL felhasználót használd: `ai_agent_test_user`.
- Ez a felhasználó csak olvasási jogosultsággal rendelkezik, kizárólag `SELECT` lekérdezésekhez.
- MI eszközből tilos `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, vagy `GRANT/REVOKE` futtatása.
- Emelt jogosultságú adatbázis-felhasználót csak szándékos, manuális karbantartási feladatokhoz használj.

### Utasításfájlok

A domain szabályok párhuzamosan karbantartottak mindkét eszközhöz:

| Claude Code | GitHub Copilot |
| ----------- | -------------- |
| `CLAUDE.md` (gyökérben) | `.github/copilot-instructions.md` |
| `app/*/CLAUDE.md` | `.github/instructions/*.instructions.md` |

---

## Hitelesítés (magas szintű)

- A rendszer ASP.NET Core Identity + JWT alapon működik, backend által kezelt HttpOnly cookie sessionnel.
- Az access és refresh tokenek biztonságos HttpOnly cookie-kban vannak, refresh token rotációval és szerveroldali (hash-elt) tárolással.
- Auth endpointok: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/validate`.
- Időpont endpointok: `GET /api/appointments`, `GET /api/appointments/today`, `POST /api/appointments/intake`, `PUT /api/appointments/{id}`, `PUT /api/appointments/{id}/claim`, `DELETE /api/appointments/{id}/claim`, `PUT /api/appointments/{id}/status`, `PUT /api/appointments/{id}/assign/{mechanicId}` (AdminOnly), `DELETE /api/appointments/{id}/assign/{mechanicId}` (AdminOnly), `POST /api/customers/{customerId}/appointments` (AdminOnly).
- A dashboard-hozzáférés szerelői fiókokra van tervezve. Bejelentkezés után a szerelők egy Ütemező oldalra kerülnek, ahol a felső összegző sáv a kijelölt napot (vagy kijelölés nélkül az aktuális napot) mutatja, a havi naptárnézet, gyors intake szekció és havi időpontlista mellett.
- Részletes biztonsági és üzemeltetési információk szándékosan nem publikusak ebben a README-ben.

---

## Indítás Aspire-rel

```Bash
cd app
dotnet run --project AutoService.AppHost
```

Ez elindítja a teljes helyi környezetet (API + infrastruktúra + kapcsolódó szolgáltatások).

---

## Lokális CI/CD act segítségével

Ha el akarod kerülni a commit-push-fail kört workflow fejlesztés közben, futtasd a GitHub Actions lépéseket lokálisan `act`-tel.

### Előfeltételek

- Docker Desktop (vagy bármely futó Docker daemon)
- Telepített `act`

### act telepítése

- Windows (Chocolatey): `choco install act-cli`
- Windows (Scoop): `scoop install act`
- macOS (Homebrew): `brew install act`
- Linux: `curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash`

### Legfontosabb parancsok

Futtasd a repository gyökeréből:

```bash
act -l
act
act -W .github/workflows/dotnet.yml
act -j build
act pull_request -j playwright-e2e --secret-file .secrets
```

### Lokális secretek act-hez

Hozz létre egy helyi `.secrets` fájlt (a `.gitignore` már kizárja), és add meg a szükséges értékeket:

```text
ARSM_TEST_MECHANIC_EMAIL=...
ARSM_TEST_MECHANIC_PASSWORD=...
ARSM_TEST_WRONG_PASSWORD=...
ARSM_TEST_CUSTOMER_EMAIL=...
```