![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

# AutoService - Időpontfoglaló és Erőforrás-kezelő Rendszer

Az AutoService egy full-stack alkalmazás, amely ASP.NET Core Web API-t használ backendként, React + TypeScript-et frontendként, valamint PostgreSQL-t adatbázisként. A rendszer egy .NET Aspire orkesztrációs rétegen fut, ami egyszerűsíti a helyi fejlesztést, az observability-t és a konténeres működést.

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

Skill források:

- `.github/skills/autoservice-mcp-context-policy/SKILL.md`
- `.github/skills/autoservice-config-driven-endpoints/SKILL.md`
- `.github/skills/autoservice-ef-migration/SKILL.md`

---

## Hitelesítés (magas szintű)

- A rendszer JWT-alapú hitelesítést használ ASP.NET Core Identity háttérrel.
- A dashboard hozzáférés szerelői fiókokra van tervezve.
- Részletes biztonsági és üzemeltetési információk szándékosan nem publikusak ebben a README-ben.

---

## Indítás Aspire-rel

```Bash
cd AutoServiceApp
cd AutoService.AppHost
dotnet run
```

Ez elindítja a teljes helyi környezetet (API + infrastruktúra + kapcsolódó szolgáltatások).