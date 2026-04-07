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
- Angol: [README.md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/README.md)

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
| **Docs** | Dokumentáció | Minden utasításfájl szinkronizálása a kóddal minden változás után |
| **Teszt Endpointok** | .http/.sql tesztek | Endpoint tesztcsomagok frissítése API-változások után |
| **Validáló** | Build ellenőrzés | `dotnet build` + `npx tsc --noEmit` futtatása és eredmény jelentése |

**Standard workflow:**

1. Orkesztrátor fázisokra bontja a feladatot
2. Backend + Frontend specialisták párhuzamosan dolgoznak
3. Validáló ágens ellenőrzi a buildet
4. Docs ágens szinkronizálja a dokumentációt; Teszt Endpointok ágens szinkronizálja a teszteket

Ágensdefiníciók:

- Claude Code: `.claude/agents/*.md`
- GitHub Copilot: `.github/agents/*.agent.md`

### Skillek (slash parancsok)

Újrahasználható runbookok, mindkét eszközből hívhatók slash parancsokkal.

| Parancs | Cél |
| ------- | --- |
| `/docs-sync` | Összes CLAUDE.md, .github/instructions és ARSM-TL-DR.md szinkronizálása a kóddal |
| `/endpoint-tests-sync` | .http és .sql tesztcsomagok frissítése endpointváltozások után |
| `/ef-migration` | EF Core migrációs workflow és hibaelhárítás |
| `/config-driven-endpoints` | Konfiguráció-alapú URL/port policy érvényesítése |
| `/mcp-context-policy` | MCP szerver interakció és Context Mode használati policy |

Skill források: `.github/skills/*/SKILL.md`

### Utasításfájlok

A domain szabályok párhuzamosan karbantartottak mindkét eszközhöz:

| Claude Code | GitHub Copilot |
| ----------- | -------------- |
| `CLAUDE.md` (gyökérben) | `.github/copilot-instructions.md` |
| `AutoServiceApp/*/CLAUDE.md` | `.github/instructions/*.instructions.md` |

---

## Hitelesítés (magas szintű)

- A rendszer ASP.NET Core Identity + JWT alapon működik, backend által kezelt HttpOnly cookie sessionnel.
- Az access és refresh tokenek biztonságos HttpOnly cookie-kban vannak, refresh token rotációval és szerveroldali (hash-elt) tárolással.
- Auth endpointok: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/validate`.
- Időpont endpointok: `GET /api/appointments`, `GET /api/appointments/today`, `PUT /api/appointments/{id}/claim`, `PUT /api/appointments/{id}/status`.
- A dashboard-hozzáférés szerelői fiókokra van tervezve. Bejelentkezés után a szerelők egy Ütemező oldalra kerülnek, amely a napi időpontokat (Tervező Tér) és egy havi naptárnézetet tartalmaz.
- Részletes biztonsági és üzemeltetési információk szándékosan nem publikusak ebben a README-ben.

---

## Indítás Aspire-rel

```Bash
cd AutoServiceApp
cd AutoService.AppHost
dotnet run
```

Ez elindítja a teljes helyi környezetet (API + infrastruktúra + kapcsolódó szolgáltatások).
