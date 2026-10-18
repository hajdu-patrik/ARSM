# ARSM - Deploying to Azure Container Apps

Target: an Azure for Students subscription. This is the **production** instance (`arsm.hu`).
Everything lives in one resource group and is created by `deploy/azure/registry.bicep` (the
container registry) and `deploy/azure/main.bicep` (everything else), driven from your Windows
machine by `python scripts/deploy-azure.py`. All settings and secrets come from the gitignored
root `.env`. The security requirements behind these choices are in
`deployment-security-checklist.md` (a local-only, gitignored file that is not in the repository);
read its section 2.6 (one host name for WebUI and API) before changing the topology.

## 1. What gets deployed

```
Browser --https--> Container Apps ingress (TLS by the platform, appends the client IP to X-Forwarded-For)
                     --> arsm-web (Container App, public ingress, two containers in one network namespace)
                           gate (port 8080): token gate, every request needs the access token
                             --http, 127.0.0.1:18080--> Nginx (web container): serves the WebUI build at /, proxies /api/* and /alive
                                                          --http--> arsm-api (Container App, internal ingress only, 1 replica max)
                                                                      --> Azure Database for PostgreSQL Flexible Server (B1ms)
                                                                      --> Azure Blob Storage (private container)
```

| Piece | Source | Notes |
| --- | --- | --- |
| API image | `deploy/api.Dockerfile` | Debian-based ASP.NET runtime (QuestPDF needs glibc), port 8080, `Production`. |
| Web image | `deploy/web.Dockerfile` + `deploy/nginx/` | `PUBLIC_URL` is baked into the bundle and its CSP; the CSP is repeated as a header with `frame-ancestors 'none'`. Inside the app it runs with `PORT=18080`. |
| Gate image | `deploy/gate/` | Copy of the teszt token gate; `GATE_MODE=azure` gates every request, reads the token from the `GATE_TOKEN` secret and logs to the console only. |
| Registry | `deploy/azure/registry.bicep` | Azure Container Registry, Basic SKU, admin user disabled. |
| Infrastructure | `deploy/azure/main.bicep`, `deploy/azure/main.bicepparam` | Reads its values from environment variables that the script exports from `.env`. |
| Driver | `scripts/deploy-azure.py` (helpers in `scripts/azure_deploy/`) | Validates `.env`, builds from a clean `git archive`, pushes, deploys, prints the DNS records. |

Why the API has no public ingress: the CSRF cookie is host-only, so the browser must reach the
API under the WebUI's host name. Nginx is that single entry point and the gate sits in front of
it, so nothing is reachable without the token.

Images are pulled from the registry with one user-assigned managed identity that holds the
`AcrPull` role on the registry. The registry admin user stays disabled, so there is no registry
password anywhere.

## 2. teszt.arsm.hu versus arsm.hu

| | `teszt.arsm.hu` | `arsm.hu` |
| --- | --- | --- |
| Role | Pre-release view where you experiment | Production, the live version handed to the tester |
| Runs on | Your machine behind a Cloudflare tunnel (mini-prod) | Azure Container Apps |
| Deployed | Automatically from `main` by the tunnel's own `deploy.py` | Manually, from a commit you choose, with `deploy-azure.py` |
| Database | The mini-prod database on your machine | A new empty Flexible Server database with only the bootstrap admin |
| Protection | Token gate on the tunnel (`GATE_TOKEN` in `.env`) | The same gate as a sidecar, token `ARSM_PROD_GATE_TOKEN` |

The two tokens must differ. `teszt.arsm.hu` is not touched by anything in this document.

## 3. Client IP chain

The API's login rate limit and ban keys need the real client address. The chain is:

1. The Azure ingress appends the real client to `X-Forwarded-For`.
2. The gate keys its own rate limit on the rightmost `X-Forwarded-For` entry (the one Azure
   appended) and forwards the request headers to Nginx unchanged.
3. Nginx sees the gate on `127.0.0.1` (`set_real_ip_from 127.0.0.1;`, plus the private ranges),
   resolves the true client with `real_ip_recursive` and overwrites `X-Forwarded-For` with it.
4. The API's `ForwardedHeaders` settings (`ForwardLimit=2`, private ranges trusted, see the
   Bicep comments) read that value, so the login limiter sees the real client.

## 4. The `.env` keys

All keys live in the repository-root `.env` (gitignored; it also holds your dev keys and the
teszt `GATE_TOKEN`, which must not be reused here). Never commit it and never paste values into
the chat. The script prints key names with `ok` or `missing` only.

Required:

| Key | Meaning |
| --- | --- |
| `ARSM_AZURE_SUBSCRIPTION_ID` | Subscription id (`az account show --query id -o tsv`). |
| `ARSM_AZURE_RESOURCE_GROUP` | Resource group the script creates and deploys into, for example `arsm-rg`. |
| `ARSM_ACR_NAME` | Registry name: 5-50 lowercase letters and digits, globally unique (login server `<name>.azurecr.io`). |
| `ARSM_PUBLIC_URL` | `https://arsm.hu` (https, no trailing slash). Baked into the web image and used as the API CORS origin. |
| `ARSM_POSTGRES_PASSWORD` | PostgreSQL administrator password. Generate: `openssl rand -base64 36`. |
| `ARSM_JWT_SECRET` | JWT signing secret, at least 32 bytes. Generate: `openssl rand -base64 48`. |
| `ARSM_PROD_GATE_TOKEN` | Access token of the gate, at least 32 characters, different from the teszt `GATE_TOKEN`. Generate: `openssl rand -hex 32`. |
| `ARSM_PROD_ADMIN_EMAIL` | E-mail of the bootstrap admin (the first account). |
| `ARSM_PROD_ADMIN_PASSWORD` | Password of the bootstrap admin; it must satisfy the registration password rules. Keep it in `.env`: every deploy requires it, and the API ignores it once an admin exists. |
| `ARSM_PROD_ADMIN_FIRST_NAME` | First name of the bootstrap admin. |
| `ARSM_PROD_ADMIN_LAST_NAME` | Last name of the bootstrap admin. |
| `ARSM_PROD_ADMIN_SPECIALIZATION` | A `SpecializationType` name: `GasolineAndDiesel`, `HybridAndElectric` or `All`. |
| `ARSM_PROD_ADMIN_EXPERTISE` | Comma separated `ExpertiseType` names, 1 to 10 unique: `Engine`, `Transmission`, `Brakes`, `Suspension`, `ElectricalSystem`, `AirConditioning`, `ExhaustSystem`, `FuelSystem`, `CoolingSystem`, `Bodywork`. |
| `ARSM_COMPANY_NAME` | Quote PDF letterhead: company name. |
| `ARSM_COMPANY_ADDRESS_LINE` | Letterhead: street and number. |
| `ARSM_COMPANY_POSTAL_CODE` | Letterhead: postal code. |
| `ARSM_COMPANY_CITY` | Letterhead: city. |
| `ARSM_COMPANY_TAX_NUMBER` | Letterhead: tax number. |
| `ARSM_COMPANY_PHONE` | Letterhead: phone number. |
| `ARSM_COMPANY_EMAIL` | Letterhead: e-mail address. |

Optional:

| Key | Meaning |
| --- | --- |
| `ARSM_AZURE_LOCATION` | Azure region, default `swedencentral`. Student subscriptions only allow some regions; on a `RequestDisallowedByAzure` error pick another one. PostgreSQL Flexible Server can still be restricted in an allowed region (`ParameterOutOfRange` on `Version`); `az postgres flexible-server list-skus -l <region>` shows it. |
| `ARSM_API_ALWAYS_ON` | Default `true`: one API replica always runs. `false` scales it to zero when idle (cold start of roughly 10-20 s: .NET start and migration check). |
| `ARSM_WEB_ALWAYS_ON` | Default `false`: the web app (gate + Nginx) scales to zero when idle, a cold start of about 2 s. `true` keeps one replica running (more credit used). |
| `ARSM_BLOB_CONTAINER` | Blob container for profile pictures, default `arsm-profile-pictures`. |
| `ARSM_PROD_ADMIN_MIDDLE_NAME` | Middle name of the bootstrap admin. |
| `ARSM_PROD_ADMIN_PHONE` | Phone number of the bootstrap admin. |

The script exports these keys to the `az` subprocess environment only (never to the command line
and never to a tracked file); `main.bicepparam` reads them with `readEnvironmentVariable`.

Paste-ready block for `.env.example` (placeholders only):

```
# --- Azure production deploy (python scripts/deploy-azure.py) ---
# Subscription id of the Azure for Students subscription (az account show --query id -o tsv).
ARSM_AZURE_SUBSCRIPTION_ID=00000000-0000-0000-0000-000000000000
# Resource group the script creates and deploys into.
ARSM_AZURE_RESOURCE_GROUP=arsm-rg
# Azure region; student subscriptions allow only some regions. Optional, default swedencentral.
ARSM_AZURE_LOCATION=swedencentral
# Container registry name: 5-50 lowercase letters/digits, globally unique.
ARSM_ACR_NAME=arsmexampleacr
# Keep one API replica always running (true) or scale it to zero when idle (false). Optional, default true.
ARSM_API_ALWAYS_ON=true
# Keep one web (gate + Nginx) replica always running. Optional, default false (scale to zero, ~2 s cold start).
ARSM_WEB_ALWAYS_ON=false
# Blob container for profile pictures. Optional, default arsm-profile-pictures.
ARSM_BLOB_CONTAINER=arsm-profile-pictures

# --- Production secrets and public address ---
# Public https origin, no trailing slash; baked into the web image and used as the CORS origin.
ARSM_PUBLIC_URL=https://arsm.hu
# PostgreSQL administrator password (openssl rand -base64 36).
ARSM_POSTGRES_PASSWORD=change-me
# JWT signing secret, at least 32 bytes (openssl rand -base64 48).
ARSM_JWT_SECRET=change-me-at-least-32-bytes-long
# Access token of the production gate, at least 32 chars and different from the teszt GATE_TOKEN.
ARSM_PROD_GATE_TOKEN=change-me-at-least-32-characters-long

# --- Bootstrap admin (the only account in the empty production database) ---
# E-mail of the first admin.
ARSM_PROD_ADMIN_EMAIL=admin@example.com
# Password of the first admin; required on every deploy, used only on the first start.
ARSM_PROD_ADMIN_PASSWORD=change-me
# First name of the first admin.
ARSM_PROD_ADMIN_FIRST_NAME=Example
# Middle name of the first admin. Optional.
ARSM_PROD_ADMIN_MIDDLE_NAME=
# Last name of the first admin.
ARSM_PROD_ADMIN_LAST_NAME=Admin
# Phone number of the first admin. Optional.
ARSM_PROD_ADMIN_PHONE=
# SpecializationType name: GasolineAndDiesel, HybridAndElectric or All.
ARSM_PROD_ADMIN_SPECIALIZATION=All
# Comma separated ExpertiseType names, 1-10 unique (Engine, Brakes, Bodywork, ...).
ARSM_PROD_ADMIN_EXPERTISE=Engine,Brakes

# --- Company letterhead on quote PDFs ---
# Company name.
ARSM_COMPANY_NAME=Example Auto Kft.
# Street and number.
ARSM_COMPANY_ADDRESS_LINE=Example utca 1.
# Postal code.
ARSM_COMPANY_POSTAL_CODE=1111
# City.
ARSM_COMPANY_CITY=Budapest
# Tax number.
ARSM_COMPANY_TAX_NUMBER=00000000-0-00
# Phone number.
ARSM_COMPANY_PHONE=+36 1 000 0000
# E-mail address.
ARSM_COMPANY_EMAIL=info@example.com
```

## 5. Commands

`python scripts/deploy-azure.py <subcommand> [--commit REF] [--dry-run] [--yes]`

| Subcommand | What it does |
| --- | --- |
| `check` | Validates the `.env` keys and the tools (`az`, `docker`, `git`); prints key names with ok/missing only. |
| `registry` | `az account set`, ensures the resource group, deploys `registry.bicep`, runs `az acr login`. |
| `images` | `git archive` of `--commit` (default `HEAD`) into a temp dir; builds and pushes `arsm-api`, `arsm-web` (with `PUBLIC_URL`) and `arsm-gate`, tagged with the 12-character commit sha. |
| `infra` | `az deployment group create` with `main.bicep` and `main.bicepparam`; prints the outputs. |
| `dns` | Prints the environment static IP, the verification id and the exact Cloudflare records. |
| `bind-domain` | Adds `arsm.hu` to `arsm-web` and binds the free managed certificate (HTTP validation, apex). Run once; later `infra`/`release` runs find the issued certificate and keep the binding. |
| `release` | `registry` + `images` + `infra` + `dns`. |

Exit codes: 0 ok, 1 a step failed, 2 bad configuration or usage. Because images are built from a
`git archive`, only committed files go into them: commit first, then deploy that commit.

## 6. Your one-time steps, in order

1. Azure for Students: open https://azure.microsoft.com/free/students, choose Start free, sign in
   with a Microsoft account and verify your student status with your university e-mail (BME). No
   credit card is needed; you get a yearly credit (check the current amount on the page) plus the
   free-service list, both visible in the portal's Education hub. When the credit runs out the
   subscription stops instead of billing you; renew it yearly while you are a student.
2. Budget alert: in the portal, Cost Management -> Budgets -> create a small monthly budget with
   e-mail alerts.
3. Register the resource providers once (check with
   `az provider show --namespace <name> --query registrationState -o tsv` until it says
   `Registered`): `az provider register --namespace Microsoft.App`, then the same for
   `Microsoft.OperationalInsights`, `Microsoft.DBforPostgreSQL`, `Microsoft.ContainerRegistry`
   and `Microsoft.Storage`.
4. Install the Azure CLI (`winget install -e --id Microsoft.AzureCLI`) and run `az login`; make
   the student subscription the active one (`az account list -o table`).
5. Install Docker Desktop and start it (Linux containers). Git and Python are already there.
6. Fill the `.env` keys of section 4: add the `.env.example` block to the example file for the
   record, then put real values into `.env`. Choose a new `ARSM_PROD_GATE_TOKEN`, not the teszt one.
7. `python scripts/deploy-azure.py check` and fix whatever it reports as missing.
8. Commit the state you want to ship, then
   `python scripts/deploy-azure.py release --commit <sha>`. It creates the registry, builds and
   pushes the three images, deploys the infrastructure and prints the DNS records. The first run
   takes a while (Flexible Server and the Container Apps environment). `--dry-run` only prints
   what it would do.
9. Cloudflare DNS (the `arsm.hu` zone is on Cloudflare). Both records must be **DNS-only**
   (grey cloud, not proxied), because Azure validates the domain and issues the certificate
   directly:
   - `A` `@` -> the environment static IP printed by `dns`.
   - `TXT` `asuid` -> the verification id printed by `dns`.
10. `python scripts/deploy-azure.py bind-domain`. If the records have not propagated yet, wait and
    run it again. The managed certificate is free and auto-renews.
11. Open `https://arsm.hu`: you get the gate lock page. Enter the `ARSM_PROD_GATE_TOKEN` value;
    the login page follows.
12. Sign in with the bootstrap admin (`ARSM_PROD_ADMIN_EMAIL` / `ARSM_PROD_ADMIN_PASSWORD`). The
    API migrated the empty database and created this single account on its first start.
13. Add the tester account in the Admin menu of the app.
14. Hand the tester the URL `https://arsm.hu`, the gate token (`ARSM_PROD_GATE_TOKEN`) and the
    login of the account from step 13, over separate channels.

### Rotating the gate token

Change `ARSM_PROD_GATE_TOKEN` in `.env` and run `python scripts/deploy-azure.py infra`. The
secret changes and the app restarts; cookies issued under the old token are revoked, so the
tester needs the new token.

### Updating

Commit, then `python scripts/deploy-azure.py release --commit <sha>`. The new images carry a new
tag, so both apps roll to a new revision; the DNS records and the certificate stay as they are.

## 7. Verification

```bash
curl -sSI https://arsm.hu/
curl -sS -o /dev/null -w "%{http_code}\n" https://arsm.hu/alive
```

Without the token both answer `401` with the gate lock page. After unlocking in the browser,
`/alive` answers `Healthy` (the gate sets the cookie; with curl, pass it with `-b`). Then check
the headers on `/`: the CSP ends in `frame-ancestors 'none'`, HSTS is present and `Cache-Control:
no-cache`. Run section 3 of the security checklist (local-only file) against the public URL, then
log in, upload a profile picture and download a quote PDF.

## 8. Operations

- Logs: `az containerapp logs show --resource-group <rg> --name arsm-api --follow`, and
  `--name arsm-web --container gate` for the gate.
- Backups: Flexible Server keeps automatic backups for 7 days (point-in-time restore). For a copy
  you own, run an occasional `pg_dump` against the server (allow your IP in the server firewall
  only for the time of the dump, then remove the rule).
- Cost: PostgreSQL B1ms (32 GB) is on the Azure for Students free list for the first 12 months.
  The always-on API replica, the Container Registry Basic SKU (a small daily fee) and the Log
  Analytics workspace draw from the credit; the web app scales to zero by default
  (`ARSM_WEB_ALWAYS_ON=false`). Check current prices and keep the budget alert on.
- The API must never run more than one replica (in-process rate limiter); the template pins
  `maxReplicas: 1`.
- The registry admin user is disabled: only the managed identity (`AcrPull`) pulls images, and
  pushing uses your own `az acr login`.

## 9. Local rehearsal of the production images

The images can be tried locally before any Azure step: build them
(`docker build -f deploy/api.Dockerfile -t arsm-api .`,
`docker build -f deploy/web.Dockerfile --build-arg PUBLIC_URL=https://arsm.test -t arsm-web .` and
`docker build -f deploy/gate/Dockerfile -t arsm-gate .`), then run PostgreSQL, an S3 store
(RustFS), the API as `arsm-api` in `Production`, the web image with `PORT=18080` and
`API_UPSTREAM=http://arsm-api:8080`, and the gate with `GATE_MODE=azure`, `GATE_TOKEN` and
`UPSTREAM_PORT=18080` in the web container's network namespace. Put a TLS-terminating proxy for
`arsm.test` in front of the gate. An earlier rehearsal of this setup covered login, CSRF, profile
picture upload with ETag/304, quote PDF, SSE, security headers, client IP resolution through the
proxy chain and a start on an empty database.
