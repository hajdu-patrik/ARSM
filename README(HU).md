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

## Copilot skillek (gyors használat)

A részletes agent policy külön skill és prompt fájlokba van szervezve.

- `/mcp-context-policy` → MCP szerverhasználat és Context Mode interakciós policy.
- `/config-driven-endpoints` → Fix, konfiguráció-alapú port/URL policy, hardcode fallback címek nélkül.
- `/ef-migration` → EF migrációs workflow és hibaelhárítás.
- `/docs-sync` → Dokumentáció szinkronizációs policy és workflow.
- `/endpoint-tests-sync` → Endpoint HTTP/SQL teszt szinkronizáció endpoint változások után.

Skill források:

- `.github/skills/autoservice-mcp-context-policy/SKILL.md`
- `.github/skills/autoservice-config-driven-endpoints/SKILL.md`
- `.github/skills/autoservice-ef-migration/SKILL.md`
- `.github/skills/autoservice-docs-sync/SKILL.md`
- `.github/skills/autoservice-endpoint-tests-sync/SKILL.md`

---

## Hitelesítés (magas szintű)

- A rendszer ASP.NET Core Identity + JWT alapon működik, backend által kezelt HttpOnly cookie sessionnel.
- Az access és refresh tokenek biztonságos HttpOnly cookie-kban vannak, refresh token rotációval és szerveroldali (hash-elt) tárolással.
- Auth endpointok: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/validate`.
- Időpont endpointok: `GET /api/appointments`, `GET /api/appointments/today`, `PUT /api/appointments/{id}/claim`, `PUT /api/appointments/{id}/status`.
- A dashboard hozzáférés szerelői fiókokra van tervezve. Bejelentkezés után a szerelők egy Ütemező oldalra kerülnek, amely a napi időpontokat (Tervező Tér) és egy havi naptárnézetet tartalmaz.
- Részletes biztonsági és üzemeltetési információk szándékosan nem publikusak ebben a README-ben.

---

## Indítás Aspire-rel

```Bash
cd AutoServiceApp
cd AutoService.AppHost
dotnet run
```

Ez elindítja a teljes helyi környezetet (API + infrastruktúra + kapcsolódó szolgáltatások).