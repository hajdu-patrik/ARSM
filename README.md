# AutoService - Appointment and Resource Management System

![.NET](https://img.shields.io/badge/Backend-.NET_10-512BD4?style=flat&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/Language-C%23_15-239120?style=flat&logo=csharp&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Aspire](https://img.shields.io/badge/Orchestration-.NET_Aspire-512BD4?style=flat&logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/ORM-EF_Core-512BD4?style=flat&logo=nuget&logoColor=white)

AutoService is a full-stack application using ASP.NET Core Web API for the backend, React + TypeScript for the frontend, and PostgreSQL as the database. The system runs on a .NET Aspire orchestration layer to simplify local development, observability, and container-based workflows.

---

## Language

- English: this file
- Hungarian: [README(HU).md](https://github.com/hajdu-patrik/Onallo-laboratorium/blob/main/README(HU).md)

## Context Mode Usage (VS Code Copilot)

For this repository, Context Mode is intended to work mostly automatically.

- Already configured in this repo:
  - MCP registration: `.vscode/mcp.json`
  - Hook routing: `.github/hooks/context-mode.json`
- After changing MCP/hook config, restart VS Code once.

### When automatic usage is enough

- Normal coding flow (small reads, edits, builds, quick diagnostics).
- Short command outputs and focused file-level changes.

### When to ask for explicit Context Mode usage

- Large command output (long logs, broad searches, large CLI/API output).
- Multi-step repository research where many commands would otherwise flood context.
- Documentation/web content processing where indexing and targeted search is useful.
- Session health checks after long work sessions.

### Practical prompts and commands

- Prompt examples:
  - "Use `ctx_batch_execute` for this repo research."
  - "Fetch and index this doc, then search for X."
- Terminal checks:
  - `context-mode --version`
  - `context-mode doctor`

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

`AppHost` is the orchestrator. It starts first, then starts infrastructure (for example PostgreSQL in Docker) and the API.

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

## Tailwind CSS integration

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
dotnet add AutoService.AppHost package Aspire.Hosting.PostgreSQL
dotnet add AutoService.AppHost package Aspire.Hosting.NodeJs
```

These enable orchestrating PostgreSQL in Docker and starting the React app via Node.js.

### 3) Entity Framework Core packages (ApiService)

```Bash
dotnet add AutoService.ApiService package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Design
dotnet add AutoService.ApiService package Microsoft.EntityFrameworkCore.Tools
```

These install the official Microsoft ORM and migration tooling. The project uses a Code-First workflow, so schema changes are trackable in Git.

### 4) Authentication packages (ApiService)

```Bash
dotnet add AutoService.ApiService package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add AutoService.ApiService package Microsoft.AspNetCore.Authentication.JwtBearer
```

`Identity.EntityFrameworkCore` adds the ASP.NET Core Identity schema (users, roles, claims, tokens) and `UserManager<IdentityUser>` to the DI container.  
`Authentication.JwtBearer` validates incoming `Authorization: Bearer <token>` headers against the configured signing key.

---

## Authentication (JWT)

The API uses **ASP.NET Core Identity** for credential storage and **JWT Bearer** tokens for stateless authentication.

- Only **mechanics** can register and log in via the dashboard.
- **Customers** are passive domain records (vehicle owners / notification targets) — they have no login accounts.
- JWT tokens include at least the following claims: `sub`, `jti`, `nameidentifier`, `email`, `name`, `person_id`, `person_type`.
- Tokens currently expire after **10 minutes**.
- Login endpoint protection: **10 login attempts per minute per client IP**, then a **3-minute cooldown**.
- Credentials must be sent over **HTTPS** only (TLS encrypted in transit).

### Required local configuration

Create `AutoServiceApp/AutoService.ApiService/appsettings.Local.json` (gitignored) for standalone runs outside Aspire:

```json
{
  "ConnectionStrings": {
    "AutoServiceDb": "Host=localhost;Port=55432;Database=AutoServiceDb;Username=postgres;Password=<your-password>"
  },
  "JwtSettings": {
    "Secret": "<your-secret-at-least-32-bytes-long>"
  },
  "DemoData": {
    "MechanicPassword": "<your-local-demo-password>"
  }
}
```

When running through AppHost, Aspire injects the connection string automatically. The JWT secret and demo password must be set manually.

### Demo login accounts (seeded on first startup)

Only mechanics receive login accounts:

| Email |
| --- |
| `gabor.kovacs@gmail.com` |
| `peter.nagy@gmail.com` |
| `mate.szabo@gmail.com` |

Use the password you configure in `DemoData:MechanicPassword` locally.

---

## Run with Aspire

```Bash
cd AutoServiceApp
cd AutoService.AppHost
dotnet run
```

This starts the orchestrated local environment (API + infrastructure + related services).

---

## Current Implementation Status (Code Audit)

### Currently Available Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login` (protected by rate limiting policy)
- `GET /openapi/v1.json` (Development environment only)

Note: there are currently no dedicated CRUD endpoints for `Customer`, `Vehicle`, or `Appointment`.

### Active Security Mechanisms

- ASP.NET Core Identity (`IdentityUser`) with EF Core store
- Password policy: minimum 8 chars with lowercase, uppercase, digit, and non-alphanumeric
- Lockout policy: 5 failed sign-in attempts triggers 15-minute lockout
- JWT validation: signed tokens required, issuer/audience validated, lifetime validated, 1-minute clock skew
- JWT secret hardening: minimum 32 bytes; missing/placeholder values fail startup
- HTTPS redirection in all environments, HSTS outside Development
- Login rate limiting: 10 requests/minute/IP, then 3-minute temporary ban (`429` + `Retry-After`)
- Transactional registration: `IdentityUser` + linked `Mechanic` domain record are created in one transaction
- Seeding safety: outside Development, demo seeding requires explicit `DemoData:EnableSeeding=true`