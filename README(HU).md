![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![SQL Server](https://img.shields.io/badge/Database-SQL_Server_2022-CC292B?style=flat&logo=microsoftsqlserver&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

# AutoService - Időpontfoglaló és Erőforrás-kezelő Rendszer

Az AutoService egy teljes stack alkalmazás, amely ASP.NET Core Web API-t használ backendként, React + TypeScript-et frontendként, valamint Microsoft SQL Server 2022-t adatbázisként. A rendszer egy .NET Aspire orkesztrációs rétegen fut, ami egyszerűsíti a helyi fejlesztést, az observability-t és a konténeres működést.

---

## Nyelv

- Magyar: ez a fájl
- Angol: [README.md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/README.md)

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

Az `AppHost` az orkesztrátor. Indításkor ez fut el először, majd elindítja az infrastruktúrát (például SQL Server Docker konténert) és az API-t.

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
dotnet add AutoService.AppHost package Aspire.Hosting.SqlServer
dotnet add AutoService.AppHost package Aspire.Hosting.NodeJs
```

Ezek teszik lehetővé, hogy az orkesztrátor SQL Server-t indítson Dockerben, és Node.js-alapú frontend folyamatokat kezeljen.

### 3) Entity Framework Core csomagok (ApiService)

```Bash
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.SqlServer
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Design
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Tools
```

Ezek telepítik a Microsoft hivatalos ORM-jét és a migrációkhoz szükséges eszközöket. A projekt Code-First megközelítést használ, így a séma változásai jól követhetők Gitben.

---

## Indítás Aspire-rel

```Bash
cd AutoService.AppHost
dotnet run
```

Ez elindítja a teljes helyi környezetet (API + infrastruktúra + kapcsolódó szolgáltatások).
