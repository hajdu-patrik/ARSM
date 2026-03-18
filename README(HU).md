# AutoService - Időpontfoglaló és Erőforrás-kezelő Rendszer

![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

Az AutoService egy full-stack alkalmazás, amely ASP.NET Core Web API-t használ backendként, React + TypeScript-et frontendként, valamint PostgreSQL-t adatbázisként. A rendszer egy .NET Aspire orkesztrációs rétegen fut, ami egyszerűsíti a helyi fejlesztést, az observability-t és a konténeres működést.

---

## Nyelv

- Magyar: ez a fájl
- Angol: [README.md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/README.md)

## Context Mode használat (VS Code Copilot)

Ebben a repositoryban a Context Mode-ot alapvetően automatikus működésre használjuk.

- Már beállítva a projektben:
  - MCP regisztráció: `.vscode/mcp.json`
  - Hook routing: `.github/hooks/context-mode.json`
- MCP vagy hook módosítás után egyszer indítsd újra a VS Code-ot.

### Mikor elég az automatikus működés

- Általános fejlesztési flow (kisebb olvasás, szerkesztés, build, gyors hibakeresés).
- Rövidebb parancskimenetek és célzott fájlszintű munka.

### Mikor érdemes explicit Context Mode használatot kérni

- Nagy kimenetű parancsoknál (hosszú logok, széles keresések, nagy CLI/API output).
- Többlépéses repository-kutatásnál, ahol sok parancs futna egymás után.
- Dokumentáció/webes tartalom feldolgozásnál, ahol indexelés + célzott keresés kell.
- Hosszabb munkamenet után állapotellenőrzéshez.

### Gyakorlati promptok és parancsok

- Prompt példák:
  - "Használd a `ctx_batch_execute` eszközt ehhez a repo kutatáshoz."
  - "Indexeld ezt a dokumentációt, majd keress rá erre: X."
- Terminál ellenőrzés:
  - `context-mode --version`
  - `context-mode doctor`

---

## Projekt inicializálása (VS Code)

### 1) Solution létrehozása

```Bash
dotnet new sln -n AutoService
```

A solution fájl a logikai konténer: összefogja a backend, frontend és orkesztrációs projekteket egy közös build egységbe.

### 2) .NET Aspire alapok létrehozása (orkesztráció + telemetria)

```Bash
dotnet new aspire-apphost -n AutoService.AppHost
dotnet new aspire-servicedefaults -n AutoService.ServiceDefaults
```

Az `AppHost` az orkesztrátor. Indításkor ez fut el először, majd elindítja az infrastruktúrát (például PostgreSQL Docker konténert) és az API-t.

A `ServiceDefaults` egy megosztott könyvtár az OpenTelemetry (logok, metrikák, trace-ek) és a health check beállításokhoz.

### 3) Backend létrehozása (Web API)

```Bash
dotnet new webapi -n AutoService.ApiService
```

Ez létrehozza az ASP.NET Core REST API projektet, ahol az üzleti logika és az adatbázis-hozzáférés található.

### 4) Frontend létrehozása (React + TypeScript)

```Bash
npm create vite@latest AutoService.WebUI -- --template react-ts
cd AutoService.WebUI
npm install
```

Ez létrehozza a React + TS alkalmazást Vite-tal, és telepíti a szükséges csomagokat.

## Tailwind CSS integráció

```Bash
cd AutoService.WebUI
npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss
```

Hozd létre a `postcss.config.js` fájlt az `AutoService.WebUI` gyökerében:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

Majd add hozzá a `src/index.css` elejéhez:

```css
@import "tailwindcss";
```

Ezután a Tailwind utility osztályok azonnal használhatók a React komponensekben.

### 5) Projektek hozzáadása a solutionhöz

```Bash
dotnet sln add AutoService.AppHost/AutoService.AppHost.csproj
dotnet sln add AutoService.ServiceDefaults/AutoService.ServiceDefaults.csproj
dotnet sln add AutoService.ApiService/AutoService.ApiService.csproj
```

---

## NuGet csomagok és projekthivatkozások

Ahhoz, hogy a projektek együtt működjenek és minden funkció elérhető legyen, add hozzá a szükséges hivatkozásokat és csomagokat.

### 1) Projekthivatkozások beállítása

```Bash
dotnet add AutoService.ApiService reference AutoService.ServiceDefaults
dotnet add AutoService.AppHost reference AutoService.ApiService
```

Az API megkapja a közös telemetria beállításokat, az AppHost pedig tudja indítani az ApiService-t.

### 2) Aspire integrációs csomagok (AppHost)

```Bash
dotnet add AutoService.AppHost package Aspire.Hosting.PostgreSQL
dotnet add AutoService.AppHost package Aspire.Hosting.NodeJs
```

Ezek teszik lehetővé, hogy az orkesztrátor PostgreSQL-t indítson Dockerben, és Node.js-alapú frontend folyamatokat kezeljen.

### 3) Entity Framework Core csomagok (ApiService)

```Bash
dotnet add AutoService.ApiService package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Design
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Tools
```

Ezek telepítik a Microsoft hivatalos ORM-jét és a migrációkhoz szükséges eszközöket. A projekt Code-First megközelítést használ, így a séma változásai jól követhetők Gitben.

### 4) Hitelesítési csomagok (ApiService)

```Bash
dotnet add AutoService.ApiService package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add AutoService.ApiService package Microsoft.AspNetCore.Authentication.JwtBearer
```

Az `Identity.EntityFrameworkCore` csomag hozzáadja az ASP.NET Core Identity sémát (felhasználók, szerepkörök, token táblák) és a `UserManager<IdentityUser>` szolgáltatást a DI tárolóhoz.  
Az `Authentication.JwtBearer` csomag ellenőrzi a beérkező `Authorization: Bearer <token>` fejléceket a konfigurált aláírókulcshoz képest.

---

## Hitelesítés (JWT)

Az API **ASP.NET Core Identity**-t használ a hitelesítő adatok tárolására és **JWT Bearer** tokeneket az állapotmentes hitelesítésre.

- Csak a **szerelők** tud regisztrálni és bejelentkezni a dashboardon.
- A **vásárlók** passzív domain rekordok (jármű tulajdonosok / értesítési célpontok) — nincs bejelentkezési fiókjuk.
- A JWT tokenek legalább a következő claimeket tartalmazzák: `sub`, `jti`, `nameidentifier`, `email`, `name`, `person_id`, `person_type`.
- A tokenek jelenleg **10 perc** elteltével lejárnak.
- Bejelentkezési védelem: **10 login próbálkozás / perc / kliens IP**, utána **3 perc tiltás**.
- A hitelesítő adatok küldése csak **HTTPS-en** történjen (TLS titkosított átvitel).

### Szükséges helyi konfiguráció

Hozd létre az `AutoServiceApp/AutoService.ApiService/appsettings.Local.json` fájlt (gitignored) az Aspire-en kívüli futtatáshoz:

```json
{
  "ConnectionStrings": {
    "AutoServiceDb": "Host=localhost;Port=55432;Database=AutoServiceDb;Username=postgres;Password=<jelszó>"
  },
  "JwtSettings": {
    "Secret": "<legalább-32-bájt-hosszú-titkos-kulcs>"
  },
  "DemoData": {
    "MechanicPassword": "<helyi-demo-jelszo>"
  }
}
```

Az AppHost-on keresztül futtatva az Aspire automatikusan injektálja a kapcsolati stringet. A JWT titkos kulcsot és a demo jelszót mindig kézzel kell beállítani.

### Demo bejelentkezési fiókok (első indításkor jönnek létre)

Csak a szerelők kapnak bejelentkezési fiókot:

| Email |
| --- |
| `gabor.kovacs@gmail.com` |
| `peter.nagy@gmail.com` |
| `mate.szabo@gmail.com` |

A jelszó a helyi `DemoData:MechanicPassword` beállításból jön.

---

## Indítás Aspire-rel

```Bash
cd AutoServiceApp
cd AutoService.AppHost
dotnet run
```

Ez elindítja a teljes helyi környezetet (API + infrastruktúra + kapcsolódó szolgáltatások).

---

## Aktuális implementációs állapot (kód audit)

### Jelenleg elérhető endpointok

- `POST /api/auth/register`
- `POST /api/auth/login` (rate limit policy-val védve)
- `GET /openapi/v1.json` (csak Development környezetben)

Megjegyzés: jelenleg nincs külön CRUD endpoint `Customer`, `Vehicle` vagy `Appointment` entitásokhoz.

### Aktív biztonsági mechanizmusok

- ASP.NET Core Identity (`IdentityUser`) + EF Core store
- Jelszó policy: minimum 8 karakter, kisbetű, nagybetű, szám, speciális karakter
- Lockout policy: 5 hibás bejelentkezés után 15 perc zárolás
- JWT validáció: kötelező aláírás, issuer/audience ellenőrzés, lejárat ellenőrzés, 1 perc clock skew
- JWT titok: minimum 32 bájt; hiány/placeholder esetén az API startupnál hibát dob
- HTTPS redirection minden környezetben, HSTS nem-development környezetben
- Login rate limit: 10 kérés/perc/IP, túllépés után 3 perces ideiglenes tiltás (`429` + `Retry-After`)
- Tranzakciós regisztráció: `IdentityUser` + kapcsolt `Mechanic` domain rekord egy tranzakcióban
- Seed védelem: production-szerű környezetben csak explicit `DemoData:EnableSeeding=true` esetén seedel