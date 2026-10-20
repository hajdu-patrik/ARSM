# ARSM - Local test instance (teszt.arsm.hu)

The local test instance (formerly "mini-prod") runs the app on the developer's Windows machine and
publishes it at `https://teszt.arsm.hu` through a Cloudflare named tunnel, behind the token gate.
Production is `https://arsm.hu` on Azure ([deployment-azure.md](deployment-azure.md)); the two
instances share no database, storage or token.

## 1. Current state

**Off since 2026-10-20.** Production moved to Azure, so the local instance was stopped reversibly:
the three scheduled tasks are disabled, the gate and tunnel processes are stopped and the four
containers are stopped (restart policy `unless-stopped`, so they stay stopped across reboots).
Kept: the Docker volumes (`arsm-tunnel-pgdata`, `arsm-tunnel-rustfs`), the `pg_dump` backups, the
Cloudflare tunnel `arsm-teszt` and its DNS record. While it is off, `teszt.arsm.hu` answers with a
Cloudflare tunnel error page (530 / error 1033). Section 3 turns it back on.

## 2. How it works

```
Browser --https--> Cloudflare --> cloudflared (tunnel arsm-teszt, cloudflared.yml)
  --> token gate (Node, deploy/gate/gate.mjs, 127.0.0.1:18081; requests with cf-connecting-ip need the token)
    --> arsm-tunnel-web (Nginx + WebUI build, 127.0.0.1:18080) --> arsm-tunnel-api
          --> arsm-tunnel-postgres (volume arsm-tunnel-pgdata)
          --> arsm-tunnel-rustfs (S3 store for profile pictures, volume arsm-tunnel-rustfs)
```

| Piece | Where | Notes |
| --- | --- | --- |
| Kit folder | `%USERPROFILE%\.arsm\tunnel` | Working copy of [deploy/local-test](../local-test) plus a copy of the gate, `bin\cloudflared.exe` and the real secret files. |
| Containers | Docker network `arsm-tunnel-net` | `arsm-tunnel-postgres` (`postgres:18.6`), `arsm-tunnel-rustfs` (`rustfs/rustfs:1.0.1`), `arsm-tunnel-api`, `arsm-tunnel-web`; `--restart unless-stopped`. |
| Token gate | `gate.mjs` in the kit (copy of [deploy/gate](../gate)) | Reads `GATE_TOKEN` from the repository-root `.env`, re-reads it when it changes; log `logs\gate.log` (rotated at 256 KiB). A request without `cf-connecting-ip` (local) passes untouched. `deploy/gate/gate.mjs` takes that `.env` path from `GATE_ENV_FILE`, which the setup's gate task supplies (`node --env-file=gate.env`); the copy in the current kit has the path built in. After copying a newer gate into the kit, re-run the setup. |
| Task `\Automations\ARSM teszt - Gate` | Task Scheduler | At logon: `conhost --headless node gate.mjs`, restart on failure. |
| Task `\Automations\ARSM teszt - Tunnel` | Task Scheduler | At logon: `conhost --headless cloudflared tunnel ... run`, restart on failure. |
| Task `\Automations\ARSM teszt - Deploy` | Task Scheduler | Every 5 minutes: `pythonw deploy.py`. |

Auto-deploy: `deploy.py` fetches `origin/main` of the repository (`ARSM_REPO` in `tunnel.env`).
When the commit differs from `deployed-sha.txt` and both GitHub Actions push workflows (`.NET`,
`Tests`) are green for it (public API, no token), it takes a `pg_dump` backup, builds the API and
web images from that commit (`git archive`, plus the repository's `deploy/` folder and the local,
gitignored `/.dockerignore`), recreates `arsm-tunnel-api` and `arsm-tunnel-web`, waits until `/` and
`/alive` answer 200, records the commit and prunes the replaced images. A red commit is never
deployed (logged once in `deploy.log`), a pending one waits. Manual runs, in the kit folder:

```powershell
python deploy.py --force               # redeploy origin/main, still requires green CI
python deploy.py --force --ignore-ci   # emergency only
python deploy.py --backup-only         # one backup now (postgres must be running)
```

The scheduled tasks run windowless: `conhost.exe --headless` for the console apps and `pythonw`
for `deploy.py`. Docker Desktop starts only at sign-in, so the site needs a logged-in user.

## 3. Turn it on

Docker Desktop must be running (`docker info` succeeds). In PowerShell:

```powershell
docker start arsm-tunnel-postgres arsm-tunnel-rustfs
docker start arsm-tunnel-api arsm-tunnel-web
# wait until the web and the API answer locally (200)
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:18080/alive

$t = '\Automations\'
'ARSM teszt - Gate', 'ARSM teszt - Tunnel', 'ARSM teszt - Deploy' |
    ForEach-Object { Enable-ScheduledTask -TaskPath $t -TaskName $_ | Out-Null }
Start-ScheduledTask -TaskPath $t -TaskName 'ARSM teszt - Gate'
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:18081/alive   # 200
Start-ScheduledTask -TaskPath $t -TaskName 'ARSM teszt - Tunnel'
curl.exe -s -o NUL -w "%{http_code}`n" https://teszt.arsm.hu/         # 401 = up, gate closed without the token
```

Once enabled, the deploy task catches up with the newest green `main` commit on its next run (a
backup is taken first). Re-running `setup-tunnel.ps1` (section 7) also turns the gate and the tunnel
on and checks both, but it neither starts the containers nor enables an existing deploy task.

## 4. Turn it off

```powershell
$t = '\Automations\'
'ARSM teszt - Deploy', 'ARSM teszt - Gate', 'ARSM teszt - Tunnel' | ForEach-Object {
    Disable-ScheduledTask -TaskPath $t -TaskName $_ | Out-Null
    Stop-ScheduledTask -TaskPath $t -TaskName $_
}
# Stop-ScheduledTask can leave the conhost-hosted children running: stop only this kit's processes.
Get-CimInstance Win32_Process |
    Where-Object { $_.Name -in 'node.exe', 'cloudflared.exe', 'conhost.exe' -and
        ($_.CommandLine -like '*\.arsm\tunnel\gate.mjs*' -or $_.CommandLine -like '*\.arsm\tunnel\cloudflared.yml*') } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
docker stop arsm-tunnel-web arsm-tunnel-api
docker stop -t 60 arsm-tunnel-postgres arsm-tunnel-rustfs
```

Never stop every `node.exe` or `cloudflared.exe`: other gates and tunnels (MaKoncert) run on the
same machine. Check that nothing of the kit is left: the query below prints nothing, and
`https://teszt.arsm.hu/` answers 530 (Cloudflare error 1033, tunnel offline).

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cloudflared.exe' OR Name='conhost.exe'" |
    Where-Object CommandLine -like '*\.arsm\tunnel\*'
```

To pause only the auto-deploy: `Disable-ScheduledTask -TaskPath '\Automations\' -TaskName 'ARSM teszt - Deploy'`.

## 5. Token gate

- Token: `GATE_TOKEN` in the repository-root `.env` (gitignored), at least 32 characters, different
  from the production `ARSM_PROD_GATE_TOKEN`. `setup-tunnel.ps1` generates one when it is missing.
- Access: open `https://teszt.arsm.hu/?access=<token>` once per browser (or use the form on the gate
  page); it sets the `__Host-arsm_gate` cookie for 30 days. Print the link in PowerShell from the
  repository root: `"https://teszt.arsm.hu/?access=" + (Select-String .env '^GATE_TOKEN=(.+)$').Matches[0].Groups[1].Value`.
- Rotation: write a new value (or delete the line and re-run the setup); every older cookie stops
  working at once. Without a usable token the gate answers 503.
- Limits: 5 wrong tokens per IP per 15 minutes and 50 overall per hour (in memory), then 429.

## 6. Backups and restore

`deploy.py` writes `backups\AutoServiceDb-<time>-<reason>.dump` (`pg_dump -Fc`) in the kit folder
before every deploy and once a day, keeping the newest 20. The profile pictures in the
`arsm-tunnel-rustfs` volume are not part of the dump. Copy the folder off the machine now and then.

Restore (overwrites the database; postgres must be running):

```powershell
docker stop arsm-tunnel-api
docker cp "$env:USERPROFILE\.arsm\tunnel\backups\<file>.dump" arsm-tunnel-postgres:/tmp/restore.dump
docker exec arsm-tunnel-postgres pg_restore -U postgres -d AutoServiceDb --clean --if-exists /tmp/restore.dump
docker exec arsm-tunnel-postgres rm /tmp/restore.dump
docker start arsm-tunnel-api
```

## 7. First-time setup

Prerequisites: Docker Desktop, Node.js 20.6 or newer (the gate task uses `node --env-file`), Python 3,
Git, a clone of this repository with its local `/.dockerignore` (the build-context allow-list that
`deploy.py` copies), and a Cloudflare zone that is Active.

1. Create the kit folder `%USERPROFILE%\.arsm\tunnel` and copy into it `deploy/local-test/deploy.py`,
   `deploy/local-test/setup-tunnel.ps1` and the gate (`deploy/gate/gate.mjs`, `gate-page.mjs`,
   `gate-style.mjs`, `gate-assets/`). Without a `gate.mjs` in the kit the setup uses the repository's
   `deploy/gate/gate.mjs` directly. Put `cloudflared.exe` into `bin\`.
2. Copy each `*.env.example` of `deploy/local-test` into the kit as `tunnel.env`, `api.env`,
   `postgres.env` and `rustfs.env`, and fill in real values (the passwords and keys must match across
   the files, as the placeholders say). Never commit them.
3. `cloudflared tunnel login` and keep the origin certificate of the zone as
   `%USERPROFILE%\.cloudflared\cert-arsm.pem` (one file per zone: `cert.pem` is overwritten by every login).
4. In PowerShell (no administrator rights needed):
   `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.arsm\tunnel\setup-tunnel.ps1" -RepoPath <repository path>`
   (optional: `-HostName`, `-TunnelName`, `-OriginCert`). It starts Docker Desktop if needed, creates
   the tunnel when `<tunnel>.json` is missing, (re)points the DNS record at it, writes and validates
   `cloudflared.yml`, saves `ARSM_REPO` and `PUBLIC_URL` in `tunnel.env` (running `deploy.py --force`
   when the URL changed), ensures `GATE_TOKEN`, registers the three tasks in `\Automations\` (the
   deploy task only when missing), removes tasks with the pre-2026-10-20 names (`ARSM teszt gate`,
   `ARSM teszt tunnel`, `ARSM mini-prod deploy` in the root folder; one registered from an elevated
   shell needs an elevated `Unregister-ScheduledTask`), restarts only this gate and this tunnel,
   checks `http://127.0.0.1:18081/` (200) and `https://<host>/` (401), and prints the secret login link.
5. When the containers do not exist yet, run `python deploy.py --force` once in the kit folder: it
   creates the network, volumes and containers and bootstraps the admin from `ADMIN_PASSWORD` on
   the empty database. Further users are registered by the admin in the app.

Changing the hostname: re-run the setup with `-HostName <host>`; it updates `cloudflared.yml`, the DNS
route and `PUBLIC_URL`, and redeploys (the web image bakes the URL into its CSP, the API gets it as
CORS origin).

## 8. Removing it completely

Turn it off (section 4), then `docker rm` the four containers, `docker volume rm arsm-tunnel-pgdata
arsm-tunnel-rustfs`, `docker network rm arsm-tunnel-net`, unregister the three tasks
(`Unregister-ScheduledTask -TaskPath '\Automations\' -TaskName '<name>' -Confirm:$false`), and delete
the tunnel with `cloudflared --origincert <cert> tunnel delete arsm-teszt` plus its DNS record in
Cloudflare. The volumes and backups hold the only copy of the test data.
