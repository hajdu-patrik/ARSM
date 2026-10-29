# ARSM - Deploying to Azure Container Apps

Target: an Azure for Students subscription. This is the **production** instance (`arsm.hu`).
Everything lives in one resource group and is created by `deploy/azure/registry.bicep` (the
container registry) and `deploy/azure/main.bicep` (everything else; its `postgres.bicep` module adds
the PostgreSQL server and database, its `dataprotection.bicep` module the DataProtection key vault, key and blob
container, its `migration-job.bicep` module the database migration job, its `guardrails.bicep` module the optional
alerts and its `budget.bicep` module the optional budget), driven from your Windows machine by
`python scripts/deploy-azure.py`. All settings and secrets come from the gitignored
root `.env`. Keep one host name for the WebUI and the API when changing the topology: the CSRF cookie
is host-only.

## 1. What gets deployed

```
Browser --https--> Container Apps ingress (TLS by the platform, appends the client IP to X-Forwarded-For)
                     --> arsm-web (Container App, public ingress, two containers in one network namespace)
                           gate (port 8080): token gate, every request needs the access token
                             --http, 127.0.0.1:18080--> Nginx (web container): serves the WebUI build at /, proxies /api/* and /alive
                                                          --http--> arsm-api (Container App, internal ingress only, 1 replica max)
                                                                      --> Azure Database for PostgreSQL Flexible Server (B1ms)
                                                                      --> Azure Blob Storage (private containers: profile pictures, DataProtection keys)
                                                                      --> Azure Key Vault (the key that encrypts the DataProtection keys)
arsm-migrate (Container Apps Job, manual trigger, the API image with --migrate-database)
  --> the same PostgreSQL server, as the administrator: migrations and the arsm_app login role
```

| Piece | Source | Notes |
| --- | --- | --- |
| API image | `deploy/api.Dockerfile` | Debian-based ASP.NET runtime (QuestPDF needs glibc), port 8080, `Production`. |
| Web image | `deploy/web.Dockerfile` + `deploy/nginx/` | `PUBLIC_URL` is baked into the bundle and its CSP; the CSP is repeated as a header with `frame-ancestors 'none'`. Inside the app it runs with `PORT=18080`. |
| Gate image | `deploy/gate/` | The token gate of the local test instance; `GATE_MODE=azure` gates every request, reads the token from the `GATE_TOKEN` secret and logs to the console only. |
| Registry | `deploy/azure/registry.bicep` | Azure Container Registry, Basic SKU, admin user disabled. |
| Migration job | `deploy/azure/migration-job.bicep` | `arsm-migrate`: the API image started with `--migrate-database`, one replica, no retries, a 15-minute replica timeout. Connected as the administrator, it applies the migrations and the startup data checks, then creates or updates the login role `arsm_app` with DML rights only. The API itself no longer migrates (`Database__MigrateOnStartup=false`) and connects as `arsm_app`. |
| Infrastructure | `deploy/azure/main.bicep`, `deploy/azure/postgres.bicep`, `deploy/azure/dataprotection.bicep`, `deploy/azure/migration-job.bicep`, `deploy/azure/guardrails.bicep`, `deploy/azure/budget.bicep`, `deploy/azure/main.bicepparam` | Reads its values from environment variables that the script exports from `.env`. |
| Driver | `scripts/deploy-azure.py` (helpers in `scripts/azure_deploy/`) | Validates `.env`, builds from a clean `git archive`, pushes, deploys, prints the DNS records. |

Why the API has no public ingress: the CSRF cookie is host-only, so the browser must reach the
API under the WebUI's host name. Nginx is that single entry point and the gate sits in front of
it, so nothing is reachable without the token.

Images are pulled from the registry with one user-assigned managed identity that holds the
`AcrPull` role on the registry. The registry admin user stays disabled, so there is no registry
password anywhere. The same identity also holds `Storage Blob Data Contributor` on the profile-picture
container only (not on the storage account), and the API signs in to Blob Storage with it, so no storage
account key sits in any app secret. For the DataProtection key ring it holds `Storage Blob Data Contributor` on the
`dataprotection-keys` container only and `Key Vault Crypto Service Encryption User` on the vault key only (see the
DataProtection keys bullet in section 8).

## 2. teszt.arsm.hu versus arsm.hu

| | `teszt.arsm.hu` | `arsm.hu` |
| --- | --- | --- |
| Role | Pre-release view where you experiment | Production, the live version handed to the tester |
| Runs on | Your machine behind a Cloudflare tunnel (local test instance, currently off) | Azure Container Apps |
| Deployed | Automatically from `main` by `deploy/local-test/deploy.py` | Manually, from a commit you choose, with `deploy-azure.py` |
| Database | The local test database on your machine | A new empty Flexible Server database with only the bootstrap admin |
| Protection | Token gate on the tunnel (`GATE_TOKEN` in `.env`) | The same gate as a sidecar, token `ARSM_PROD_GATE_TOKEN` |

The two tokens must differ. `teszt.arsm.hu` is not touched by anything in this document; it is
described, with how to turn it on and off, in [deployment-local-test.md](deployment-local-test.md).

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
| `ARSM_POSTGRES_PASSWORD` | PostgreSQL administrator password. Generate: `openssl rand -base64 36`. Only the migration job connects with it. |
| `ARSM_POSTGRES_APP_PASSWORD` | Password of the login role `arsm_app` the API connects as; the migration job sets it. Generate: `openssl rand -base64 36`. Same rules as `ARSM_POSTGRES_PASSWORD` and it must differ from it (`check` rejects a reuse). |
| `ARSM_JWT_SECRET` | JWT signing secret, at least 32 bytes. Generate: `openssl rand -base64 48`. |
| `ARSM_PROD_GATE_TOKEN` | Access token of the gate, at least 32 characters, different from the teszt `GATE_TOKEN`. Generate: `openssl rand -hex 32`. |
| `ARSM_PROD_ADMIN_EMAIL` | E-mail of the bootstrap admin (the first account). |
| `ARSM_PROD_ADMIN_PASSWORD` | Password of the bootstrap admin; it must satisfy the registration password rules. Keep it in `.env`: every deploy requires it, and the API ignores it once an admin exists. |
| `ARSM_PROD_ADMIN_FIRST_NAME` | First name of the bootstrap admin. |
| `ARSM_PROD_ADMIN_LAST_NAME` | Last name of the bootstrap admin. |
| `ARSM_PROD_ADMIN_SPECIALIZATION` | A `SpecializationType` name: `GasolineAndDiesel`, `HybridAndElectric` or `All`. |
| `ARSM_PROD_ADMIN_EXPERTISE` | Comma separated `ExpertiseType` names, 1 to 10 unique: `Engine`, `Transmission`, `Brakes`, `Suspension`, `ElectricalSystem`, `AirConditioning`, `ExhaustSystem`, `FuelSystem`, `CoolingSystem`, `Bodywork`. |
| `ARSM_COMPANY_NAME` | Quote PDF letterhead: company name. The `ARSM_COMPANY_*` values only seed the `companyprofiles` table on the first start; afterwards an Admin edits it in Settings. |
| `ARSM_COMPANY_ADDRESS_LINE` | Letterhead: street and number. |
| `ARSM_COMPANY_POSTAL_CODE` | Letterhead: postal code. |
| `ARSM_COMPANY_CITY` | Letterhead: city. |
| `ARSM_COMPANY_TAX_NUMBER` | Letterhead: tax number. |
| `ARSM_COMPANY_PHONE` | Letterhead: phone number. |
| `ARSM_COMPANY_EMAIL` | Letterhead: e-mail address. |
| `ARSM_RESEND_API_KEY` | Resend sending key of the verified `arsm.hu` domain (region eu-west-1). Never printed. |
| `ARSM_MAIL_FROM` | Display name and address of the sender, for example `ARSM <info@arsm.hu>`. |
| `ARSM_MAIL_REPLY_TO` | Reply address, `info@arsm.hu`, which Cloudflare Email Routing forwards. DNS is not managed by this kit. |

Optional:

| Key | Meaning |
| --- | --- |
| `ARSM_AZURE_LOCATION` | Azure region, default `swedencentral`. Student subscriptions only allow some regions; on a `RequestDisallowedByAzure` error pick another one. PostgreSQL Flexible Server can still be restricted in an allowed region (`ParameterOutOfRange` on `Version`); `az postgres flexible-server list-skus -l <region>` shows it. |
| `ARSM_API_ALWAYS_ON` | Default `true`: one API replica always runs. `false` scales it to zero when idle (cold start of roughly 10-20 s: .NET start; the migrations run in the job, not at API start). |
| `ARSM_WEB_ALWAYS_ON` | Default `false`: the web app (gate + Nginx) scales to zero when idle, a cold start of about 2 s. `true` keeps one replica running (more credit used). |
| `ARSM_BLOB_CONTAINER` | Blob container for profile pictures, default `arsm-profile-pictures`. |
| `ARSM_ALERT_EMAIL` | Address for the alert and budget mails (see Guard rails in section 8). Empty (default): no action group, alert rule or budget is created. |
| `ARSM_MONTHLY_BUDGET` | Monthly budget of the resource group in the subscription currency, a whole number, default `0` (no budget). Above 0 it mails at 50, 80 and 100 percent of the amount and needs `ARSM_ALERT_EMAIL`. Microsoft lists the Azure for Students offer (MS-AZR-0170P) as not supported by Cost Management, where budgets live, so keep `0` on a student subscription. |
| `ARSM_LOG_DAILY_QUOTA_GB` | Daily ingestion cap of the Log Analytics workspace in GB, a whole number from 1, default `1`. Always applied, with or without an alert address. |
| `ARSM_PROD_ADMIN_MIDDLE_NAME` | Middle name of the bootstrap admin. |
| `ARSM_PROD_ADMIN_PHONE` | Phone number of the bootstrap admin. |

The script exports these keys to the `az` subprocess environment only (never to the command line
and never to a tracked file); `main.bicepparam` reads them with `readEnvironmentVariable`.

`.env.example` in the repository root lists every key above with a placeholder value.

## 5. Commands

`python scripts/deploy-azure.py <subcommand> [--commit REF] [--dry-run] [--yes]`

| Subcommand | What it does |
| --- | --- |
| `check` | Validates the `.env` keys and the tools (`az`, `docker`, `git`); prints key names with ok/missing only. It also asks `az` (read-only, needs `az login`) whether `Microsoft.KeyVault` is registered and, with `ARSM_ALERT_EMAIL` set, `Microsoft.Insights` (and `Microsoft.Consumption` for a budget), and only warns when one is not. |
| `registry` | `az account set`, ensures the resource group, deploys `registry.bicep`, runs `az acr login`. |
| `images` | `git archive` of `--commit` (default `HEAD`) into a temp dir; builds and pushes `arsm-api`, `arsm-web` (with `PUBLIC_URL`) and `arsm-gate`, tagged with the 12-character commit sha. |
| `infra` | Three steps with `main.bicep` and `main.bicepparam`. Phase 1 (deployment `arsm-main-pre-apps`, `ARSM_DEPLOY_APPS=false`, set by the script only) deploys everything except the two Container Apps and the alert rules that watch them, the migration job with the new image included; the incremental deployment leaves the running app revisions as they are. Then `az containerapp job start --name arsm-migrate` and a poll of `az containerapp job execution show ... --query properties.status` every 15 s until `Succeeded`; `Failed`, `Stopped`, `Degraded` or 20 minutes without success stop the step (exit 1) with the apps untouched. Phase 2 (deployment `arsm-main`) deploys the full template, apps included, and prints its outputs, which `dns` reads. `--dry-run` prints the commands (one status query included) without polling. |
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
2. Alerts and budget: set `ARSM_ALERT_EMAIL` in step 6. The deployment then creates the action
   group and the four alert rules (Guard rails in section 8), so there is nothing to set up by hand
   in the portal. A budget is a separate opt-in (`ARSM_MONTHLY_BUDGET` above 0); Azure for Students
   does not support budgets, so leave it at `0` on the student subscription.
3. Register the resource providers once (check with
   `az provider show --namespace <name> --query registrationState -o tsv` until it says
   `Registered`): `az provider register --namespace Microsoft.App`, then the same for
   `Microsoft.OperationalInsights`, `Microsoft.DBforPostgreSQL`, `Microsoft.ContainerRegistry`,
   `Microsoft.Storage` and `Microsoft.KeyVault` (the DataProtection key vault), plus `Microsoft.Insights` for the alert rules (and
   `Microsoft.Consumption` only if you switch the budget on). `deploy-azure.py check` warns when
   `Microsoft.KeyVault` or a provider of the guard rails you switched on is not registered; it needs `az login` for that.
4. Install the Azure CLI (`winget install -e --id Microsoft.AzureCLI`) and run `az login`; make
   the student subscription the active one (`az account list -o table`).
5. Install Docker Desktop and start it (Linux containers). Git and Python are already there.
6. Put real values into the `.env` keys of section 4 (copy `.env.example` first if there is no
   `.env` yet). Choose a new `ARSM_PROD_GATE_TOKEN`, not the teszt one, and an
   `ARSM_POSTGRES_APP_PASSWORD` that differs from `ARSM_POSTGRES_PASSWORD`.
7. `python scripts/deploy-azure.py check` and fix whatever it reports as missing.
8. Commit the state you want to ship, then
   `python scripts/deploy-azure.py release --commit <sha>`. It creates the registry, builds and
   pushes the three images, deploys the infrastructure without the apps, runs the migration job
   (which migrates the empty database and creates `arsm_app`), waits for it to succeed, then
   deploys the apps and prints the DNS records. The first run takes a while (Flexible Server and
   the Container Apps environment). `--dry-run` only prints what it would do.
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
    migration job migrated the empty database, and the API created this single account on its
    first start.
13. Add the tester account in the Admin menu of the app.
14. Hand the tester the URL `https://arsm.hu`, the gate token (`ARSM_PROD_GATE_TOKEN`) and the
    login of the account from step 13, over separate channels.

### Rotating the gate token

Change `ARSM_PROD_GATE_TOKEN` in `.env` and run `python scripts/deploy-azure.py infra`. The
secret changes and the app restarts; cookies issued under the old token are revoked, so the
tester needs the new token.

### Updating

Commit, then `python scripts/deploy-azure.py release --commit <sha>`. The new images carry a new
tag. `infra` first points the migration job at the new API image and runs it, so a new migration is
applied before any app changes; only after the execution succeeded do both apps roll to a new
revision. A failed job stops the release with the old revisions still serving; read its logs
(section 8), fix, commit and release again. The DNS records and the certificate stay as they are.
The first release of this setup on an existing deployment works the same way: the job creates
`arsm_app` before the API switches its login.

To rotate `ARSM_POSTGRES_APP_PASSWORD`, change it in `.env` and run
`python scripts/deploy-azure.py infra`: the job sets the new password, then phase 2 updates the
API's `db-connection` secret. Until the API runs with the new secret, its new database connections
are refused; if the revision keeps the old value, restart it:
`az containerapp revision restart --resource-group <rg> --name arsm-api --revision <revision>`
(`az containerapp revision list --resource-group <rg> --name arsm-api -o table` lists the names).

## 7. Verification

```bash
curl -sSI https://arsm.hu/
curl -sS -o /dev/null -w "%{http_code}\n" https://arsm.hu/alive
```

Without the token both answer `401` with the gate lock page. After unlocking in the browser,
`/alive` answers `Healthy` (the gate sets the cookie; with curl, pass it with `-b`). Then check
the headers on `/`: the CSP ends in `frame-ancestors 'none'`, HSTS is present and `Cache-Control:
no-cache`. Then log in, upload a profile picture and download a quote PDF.

With `ARSM_ALERT_EMAIL` set, `az monitor metrics alert list --resource-group <rg> --output table`
lists `arsm-api-5xx` and `arsm-api-restarts`, and `az monitor scheduled-query list --resource-group <rg> --output table`
(`scheduled-query` extension) lists `arsm-api-errors` and `arsm-api-warnings`; with `ARSM_MONTHLY_BUDGET` above 0 as well, the Budgets
page of the resource group in the portal shows `arsm-monthly-budget`.

## 8. Operations

- Logs: `az containerapp logs show --resource-group <rg> --name arsm-api --follow`, and
  `--name arsm-web --container gate` for the gate.
- Migration job logs: `az containerapp job execution list --resource-group <rg> --name arsm-migrate -o table`
  lists the executions and their status; the console output of one is under Execution history of the
  `arsm-migrate` job in the portal, or in the Log Analytics workspace with
  `ContainerAppConsoleLogs_CL | where ContainerJobName_s == 'arsm-migrate'`. The job logs its progress and, on
  a failed role step, only the exception type and SQLSTATE; the `arsm_app` password is never logged.
- `ServerIsBusy` on a PostgreSQL child resource: a Flexible Server accepts one write at a time, so `postgres.bicep`
  chains its children (`azure.extensions`, then the firewall rule, then `AutoServiceDb`) with `dependsOn`. If a
  run still meets it (the server busy with its own maintenance), wait for `state` `Ready` and run `infra` again.
- Backups: Flexible Server keeps automatic backups for 7 days (point-in-time restore). For a copy
  you own, run an occasional `pg_dump` against the server (allow your IP in the server firewall
  only for the time of the dump, then remove the rule).
- Cost: PostgreSQL B1ms (32 GB) is on the Azure for Students free list for the first 12 months.
  The always-on API replica, the Container Registry Basic SKU (a small daily fee) and the Log
  Analytics workspace draw from the credit; the web app scales to zero by default
  (`ARSM_WEB_ALWAYS_ON=false`). Check current prices; the budget under Guard rails below watches
  the spend.
- The API must never run more than one replica (in-process rate limiter); the template pins
  `maxReplicas: 1`.
- The registry admin user is disabled: only the managed identity (`AcrPull`) pulls images, and
  pushing uses your own `az acr login`.
- Managed identity for Blob Storage (implemented): the template grants the user-assigned identity
  `Storage Blob Data Contributor` through a role assignment scoped to the picture container, and the API app gets
  `ObjectStorage__ServiceUrl` (the account's blob endpoint) and `ObjectStorage__ManagedIdentityClientId` (the
  identity's client id) instead of a connection string. `ObjectStorageRegistration` builds the
  `BlobContainerClient` with a `ManagedIdentityCredential` for that client id, so `listKeys()` and the
  `blob-connection` secret are gone. A key leaked from an app secret is no longer possible; the shared key of the
  account itself stays enabled (`allowSharedKeyAccess` is unchanged). Right after the first role assignment the
  API's container check at startup can fail until RBAC propagates (a few minutes); the revision recovers by
  restarting.
- DataProtection keys (implemented): the API's ASP.NET Core key ring would otherwise live in the container's file system and be regenerated on every revision.
  `main.bicep` (module `dataprotection.bicep`) creates the private blob container `dataprotection-keys` in the existing storage account, the Key Vault
  `<prefix>kv<suffix>` (standard SKU, Azure RBAC authorization, public network access on because Consumption apps have
  no fixed outbound address, soft delete at the platform default, purge protection off because it cannot be undone)
  and in it the key `dataprotection` (RSA 2048, operations `wrapKey` and `unwrapKey` only). The user-assigned
  identity holds `Storage Blob Data Contributor` on that container only and `Key Vault Crypto Service Encryption User`
  on that key only. The API app gets `DataProtection__Provider=AzureBlob`, `DataProtection__BlobUri` (the `keys.xml`
  blob in the container), `DataProtection__KeyVaultKeyUri` (the versionless key id) and
  `DataProtection__ManagedIdentityClientId`; the key ring is stored in `keys.xml`, encrypted with the vault key, so
  it persists across revisions and restarts and the blob alone is useless without the key. The migration job gets
  none of this. No `.env` key is involved, the names derive from the prefix and the resource group. Right after the
  first role assignments the API can fail to reach the blob or the key until RBAC propagates (a few minutes); the
  revision recovers by restarting. Do not delete the vault or its key: the stored key ring could then not be read.
  Soft delete: a deleted vault keeps its name while it is soft-deleted, so the next `infra` fails until you run
  `az keyvault recover --name <vault>` (or free the name with `az keyvault purge --name <vault>`). If the vault or the
  key is lost or purged and created anew, the existing `dataprotection-keys/keys.xml` blob can no longer be unwrapped:
  delete that blob and restart the API, which then writes a new key ring; whatever the old ring protected (Identity
  tokens) stops validating.
- Least-privilege database role (implemented): the API connects as the login role `arsm_app`
  (`Username=arsm_app`, password `ARSM_POSTGRES_APP_PASSWORD`, secret `db-connection`) and runs with
  `Database__MigrateOnStartup=false`, so it never migrates. The migration job `arsm-migrate` connects as the
  administrator (secret `db-admin-connection`, `Maximum Pool Size=5`), runs the same migration and data checks the
  API used to run at startup, then, in one transaction, creates `arsm_app` or updates its password
  (`ALTER ROLE ... LOGIN PASSWORD`) and grants: `CONNECT` on `AutoServiceDb`, `USAGE` on schema `public`, `SELECT`,
  `INSERT`, `UPDATE`, `DELETE` on all tables and `USAGE`, `SELECT`, `UPDATE` on all sequences in `public`, plus
  `ALTER DEFAULT PRIVILEGES` in `public` for the tables and sequences the administrator's later migrations create.
  Every run re-applies the same set. The password reaches the server as a bound parameter, never in a logged
  command text. Residual risk: a leaked API connection string now gives DML on the data of `AutoServiceDb` only, no
  DDL and no server control; the administrator password still lives in the job's `db-admin-connection` secret and in
  the root `.env`, and the migrations run only through the job (`deploy-azure.py infra`). Local stacks (Aspire, CI,
  the pre-push stack, `deploy/local-test`) leave `Database:MigrateOnStartup` unset and keep migrating at API start.

### Guard rails

The log cap, the database pool cap and the Nginx limits are always on. The action group and the alert rules
(`guardrails.bicep`) exist only when `ARSM_ALERT_EMAIL` is set: put your address there and run
`python scripts/deploy-azure.py infra`. The budget (`budget.bicep`, a module of its own) also needs
`ARSM_MONTHLY_BUDGET` above 0. Emptying or zeroing a key later only stops creating them; an incremental deployment
deletes nothing, so remove the existing budget, action group and alert rules in the portal.

- Log cap: the Log Analytics workspace takes in at most `ARSM_LOG_DAILY_QUOTA_GB` GB a day (default 1). At the cap
  Azure stops collecting new logs until the workspace's own reset hour (shown under Usage and estimated costs of the
  workspace, not configurable), so the console logs of that stretch are lost. The cap is approximate: some data
  above it still arrives and is billed. The 5xx and restart rules read platform metrics, so they keep working at the cap;
  the error and warning rules read the console logs, so they go quiet while collection is paused.
- Budget (opt-in): with `ARSM_MONTHLY_BUDGET` above 0, `arsm-monthly-budget` covers the resource group with that
  amount per month (in the subscription currency) and mails `ARSM_ALERT_EMAIL` at 50, 80 and 100 percent of the actual
  cost. Cost data is 8-24 hours old and budgets are evaluated once a day, so a mail lags the spend; it only warns and
  stops nothing. Add `azure-noreply@microsoft.com` to the approved senders so the mails stay out of the junk folder.
  Microsoft lists Azure for Students (MS-AZR-0170P) as an offer Cost Management does not support, so the default is
  no budget. If a subscription cannot take one anyway, only the budget module fails (`infra` reports the error, the
  alert rules are already in place): set the key back to `0` and run `infra` again.
- Metric alert rules (severity 2, mailed through the action group `arsm-alerts`): `arsm-api-5xx` fires when the API answers
  more than 5 requests with a 5xx status within 5 minutes; `arsm-api-restarts` fires when the API's `RestartCount`
  is above 0 over 15 minutes. Both are checked every 5 minutes. `RestartCount` counts the restarts of a replica
  since it was created, so that rule stays active until the replica is replaced (the next deployment, a scale from
  zero); a rule mails when it fires and when it resolves, not for every further restart.
- Log alert rules (same action group, e-mail and API-only filter; they query `ContainerAppConsoleLogs_CL` of the
  workspace for `ContainerAppName_s == "arsm-api"` and `ContainerName_s == "api"`): `arsm-api-errors` (severity 1)
  fires when a console line of the window starts with `fail:` or `crit:`, i.e. the API logged at Error or Critical
  level; `arsm-api-warnings` (severity 3) does the same for `warn:` lines, except the ones the client causes or that
  are known to be harmless (owner decision 2026-10-29, so mails stay rare and mean a real problem): the categories
  `AuthEndpoints.*` (wrong passwords, rejected logins and refreshes), `AppointmentEndpoints.*` and `AdminEndpoints.*`
  (rejected requests), `Auth.AccessDenied` (the 401/403 audit line), `HttpsRedirectionMiddleware` (the startup "https
  port" notice behind the proxy) and `Microsoft.EntityFrameworkCore.Query` (query hints). Mail, storage, key ring and
  startup warnings still fire; on 30 days of production logs only the old DataProtection warnings would have. The
  API image runs ASP.NET Core's default
  simple console formatter (no JSON formatter is configured), which prefixes every record with its level. Both are
  checked every 5 minutes over the last 5 minutes and fire when the count is above 0. The query returns one row per
  evaluation (`LineCount` and a `Sample` of the first three matching lines, at most 500 characters), and the rules are
  stateless (`autoMitigate: false`), so every 5-minute window with matching lines sends exactly one mail however many
  different messages it holds, and no resolve mail follows. The rule name in the mail subject tells which one fired;
  the mail shows the count as the metric value, the sample as a dimension and a link to the matching log search.
  The simple formatter writes the message on the row after the `fail: <category>[<event id>]` line, so the sample
  names the category and the full text is in the linked search. A window without matching lines sends nothing, and
  errors that keep coming mail once per window for as long as they last. A log line is ingested a minute or two
  after it was written, so a rule can see it one evaluation later. Logging levels are unchanged; the rules only read
  what the API already writes.
- Database connections: the API's connection string carries `Maximum Pool Size=20` and the migration job's
  `Maximum Pool Size=5`. A B1ms server allows 50 connections by default, 15 of them reserved for the platform, so
  Npgsql's default pool of 100 exceeds it. Old and new replica overlap briefly during a rollout, but a pool only grows
  with concurrent queries; the job has finished before the apps roll.
- Nginx request limits (web image, `deploy/nginx/`): the two event streams (`GET /api/appointments/updates`,
  `GET /api/profile/picture/updates`) run unbuffered with a read timeout of 1 hour; the picture upload
  (`PUT /api/profile/picture`) accepts bodies up to 5 MB (the API allows 4 MB plus multipart overhead); every other
  API call and `/alive` keeps the default 60 s read timeout and accepts bodies up to 64 KB, the API's JSON body
  limit. A larger body gets Nginx's own 413. The directives the three locations share are in `api-proxy.conf`;
  regex locations match in file order, so a new narrow API route goes above the catch-all in
  `default.conf.template`.

### Recommendations that are not implemented

**Narrower database firewall rule.** `AllowAzureServices` (0.0.0.0) lets every Azure service in any subscription
reach the server's public endpoint; only the login, its password and TLS stand in the way. It is that wide because a
Consumption Container Apps environment has no fixed outbound address, so there is no narrower address to allow. The
alternatives are a virtual network for the environment with the database behind a private endpoint, or a NAT
gateway that gives the environment one fixed outbound address to allow. Both mean a new environment (and so new DNS
records) plus the network pieces and their price, which is out of scope for this kit.

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
