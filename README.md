![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![SQL Server](https://img.shields.io/badge/Database-SQL_Server_2022-CC292B?style=flat&logo=microsoftsqlserver&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

# AutoService - Appointment and Resource Management System

AutoService is a full-stack application using ASP.NET Core Web API for the backend, React + TypeScript for the frontend, and Microsoft SQL Server 2022 as the database. The system runs on a .NET Aspire orchestration layer to simplify local development, observability, and container-based workflows.

---

## Language

- English: this file
- Hungarian: `README(HU).md`

---

## Project Initialization (VS Code)

### 1) Create the solution

```Bash
dotnet new sln -n AutoService
```

The solution file is the logical container that groups backend, frontend, and orchestration projects into one build unit.

### 2) Create .NET Aspire foundations (orchestration + telemetry)

```Bash
dotnet new aspire-apphost -n AutoService.AppHost
dotnet new aspire-servicedefaults -n AutoService.ServiceDefaults
```

`AppHost` is the orchestrator. It starts first, then starts infrastructure (for example SQL Server in Docker) and the API.

`ServiceDefaults` is a shared library for OpenTelemetry (logs, metrics, traces) and health checks.

### 3) Create backend (Web API)

```Bash
dotnet new webapi -n AutoService.ApiService
```

This creates the ASP.NET Core REST API project that hosts the business logic and database access.

### 4) Create frontend (React + TypeScript)

```Bash
npm create vite@latest AutoService.WebUI -- --template react-ts
cd AutoService.WebUI
npm install
```

This creates a React + TS app with Vite and installs the required dependencies.

## Tailwind CSS integráció

```Bash
cd AutoService.WebUI
npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss
```

Create `postcss.config.js` in `AutoService.WebUI`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

Then add this to the top of `src/index.css`:

```css
@import "tailwindcss";
```

Tailwind utility classes are then available in your React components.

### 5) Add projects to the solution

```Bash
dotnet sln add AutoService.AppHost/AutoService.AppHost.csproj
dotnet sln add AutoService.ServiceDefaults/AutoService.ServiceDefaults.csproj
dotnet sln add AutoService.ApiService/AutoService.ApiService.csproj
```

---

## NuGet packages and project references

To connect projects and enable required features, add references and packages.

### 1) Set project references

```Bash
dotnet add AutoService.ApiService reference AutoService.ServiceDefaults
dotnet add AutoService.AppHost reference AutoService.ApiService
```

The API receives shared telemetry defaults, and AppHost is able to start ApiService.

### 2) Aspire integration packages (AppHost)

```Bash
dotnet add AutoService.AppHost package Aspire.Hosting.SqlServer
dotnet add AutoService.AppHost package Aspire.Hosting.NodeJs
```

These enable orchestrating SQL Server in Docker and starting the React app via Node.js.

### 3) Entity Framework Core packages (ApiService)

```Bash
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.SqlServer
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Design
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Tools
```

These install the official Microsoft ORM and migration tooling. The project uses a Code-First workflow, so schema changes are trackable in Git.

---

## Run with Aspire

```Bash
cd AutoService.AppHost
dotnet run
```

This starts the orchestrated local environment (API + infrastructure + related services).