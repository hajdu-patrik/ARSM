# ARSM - Local test instance (teszt.arsm.hu)

The local test instance (formerly "mini-prod") runs the app on the developer's Windows machine and
publishes it at `https://teszt.arsm.hu` through a Cloudflare named tunnel, behind the token gate.
Production is `https://arsm.hu` on Azure ([deployment-azure.md](deployment-azure.md)); the two
instances share no database, storage or token.

## 1. Current state

**On since 2026-10-23** (owner decision; it was off from 2026-10-20 after production moved to Azure). The deploy task
runs `deploy.py --ignore-ci` every 5 minutes, so every new `origin/main` commit is deployed without waiting for CI; the
repository's pre-push gate is the check. `teszt.ps1 off` (section 4) disables the three scheduled tasks, stops the gate,
tunnel and the four containers (restart policy `no`) and keeps the Docker volumes (`arsm-tunnel-pgdata`,
`arsm-tunnel-rustfs`, `arsm-tunnel-dpkeys`), the `pg_dump` backups, the Cloudflare tunnel `arsm-teszt` and its DNS
record; while off, `teszt.arsm.hu` answers with a Cloudflare tunnel error page (530 / error 1033). Section 3 turns it on.

## 2. How it works

```
Browser --https--> Cloudflare --> cloudflared (tunnel arsm-teszt, cloudflared.yml)
  --> token gate (Node, deploy/gate/gate.mjs, 127.0.0.1:18081; requests with cf-connecting-ip need the token)
    --> arsm-tunnel-web (Nginx + WebUI build, 127.0.0.1:18080) --> arsm-tunnel-api
          --> arsm-tunnel-postgres (volume arsm-tunnel-pgdata)
          --> arsm-tunnel-rustfs (S3 store for profile pictures, volume arsm-tunnel-rustfs)
```

The kit has the same structure as the owner's other local test kit (MaKoncert): `README.txt`,
`setup.ps1`, `run.cmd`, `teszt.ps1` with `kit.psd1`, the deploy script and `logs\`; only the app
runtime differs (here Docker containers).

| Piece | Where | Notes |
| --- | --- | --- |
| Kit folder | `%USERPROFILE%\.arsm\tunnel` | Working copy of [deploy/local-test](../local-test) plus a copy of the gate, `bin\cloudflared.exe` and the real secret files. `deploy.py` and the gate files update themselves from the deployed commit (kit self-update below). |
| Containers | Docker network `arsm-tunnel-net` | `arsm-tunnel-postgres` (`postgres:18.6`), `arsm-tunnel-rustfs` (`rustfs/rustfs:1.0.1`), `arsm-tunnel-api`, `arsm-tunnel-web`; restart policy `unless-stopped` while on, `no` while off. Volumes: `arsm-tunnel-pgdata`, `arsm-tunnel-rustfs` and `arsm-tunnel-dpkeys` (the API's ASP.NET Core DataProtection keys, mounted at `/var/lib/arsm/dataprotection-keys`, unencrypted, created by `deploy.py` when missing; `deploy.py` passes `DataProtection__Provider=FileSystem` and `DataProtection__KeyDirectory` to the container, so `api.env` needs neither). The image creates that directory owned by the non-root runtime user, so a fresh volume is writable. The RustFS console is off: `rustfs.env` sets `RUSTFS_CONSOLE_ENABLE=false`, and `deploy.py` also passes `-e RUSTFS_CONSOLE_ENABLE=false` when it creates `arsm-tunnel-rustfs` (it wins over `--env-file`), so an older `rustfs.env` cannot turn it on again. A container created before that keeps its settings until it is recreated (`docker rm -f arsm-tunnel-rustfs`, then the next deploy run); an existing real `rustfs.env` should still lose `RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS`. |
| Token gate | `gate.mjs` in the kit (copy of [deploy/gate](../gate)) | Reads `GATE_TOKEN` from the repository-root `.env` named by `GATE_ENV_FILE` in `gate.env` (written by the setup, passed as `node --env-file=gate.env`), re-reads it when it changes. A request without `cf-connecting-ip` (local) passes untouched. `run.cmd` sets `GATE_LOG_FILE=off`, so the gate logs only to its console, which `run.cmd` writes into `logs\gate.log`. |
| Task `\Automations\ARSM teszt - Gate` | Task Scheduler | At logon: `conhost.exe --headless cmd.exe /d /s /c ""<kit>\run.cmd" gate"`, restart on failure, no time limit. |
| Task `\Automations\ARSM teszt - Tunnel` | Task Scheduler | At logon: the same with `run.cmd tunnel` (`cloudflared tunnel --no-autoupdate --config cloudflared.yml run`). |
| Task `\Automations\ARSM teszt - Deploy` | Task Scheduler | Every 5 minutes: `conhost.exe --headless python.exe deploy.py`, at most 45 minutes, never overlapping itself. |

`run.cmd` restarts its process 3 seconds after it exits, doubling the wait up to 60 seconds while
the process dies within 30 seconds. It writes the console output into `logs\gate.log` or
`logs\tunnel.log` with `===== <time> start: <command>` and `===== <time> exited with <code>; restarting
in <n> s` lines, and moves a log over 20 MB to `*.1` on a restart. cloudflared writes the same
messages it used to write with `--logfile`, in its text format.

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

Kit self-update: after a successful deploy, and on every idle run, `deploy.py` compares the kit's
self-updated files with the commit in `deployed-sha.txt` and rewrites the ones that differ, so a pushed
kit change goes live with the next deploy and an already deployed commit still syncs once. The
comparison is local and cheap: one `git ls-tree` of that commit and the git object ids of the installed
files, no network call. The files come from the commit (`git cat-file blob`), never from the working
tree, byte for byte with the line endings stored in git, each written atomically (temp file, then
replace), and every rewrite is logged in `deploy.log` (`kit: updated <file> from <sha>`).

| Synced automatically | Kit path |
| --- | --- |
| `deploy/local-test/deploy.py` | `deploy.py` (the running process keeps its loaded code; the next run uses the new file) |
| `deploy/gate/gate.mjs`, `gate-page.mjs`, `gate-style.mjs` | same names in the kit folder |
| `deploy/gate/gate-assets/**` | `gate-assets\` (missing files are added; files removed from git are not deleted) |

- Gate restart: when a gate file changed, `deploy.py` stops only the `node.exe` process whose command
  line runs the kit's own `gate.mjs` (full path, via `Get-CimInstance Win32_Process`; other node
  processes such as the MaKoncert kit's are never touched), and `run.cmd` starts the new code 3 seconds
  later. `gate-restart.txt` marks a restart that is still due, so a failed one is retried on the next run.
- Manual only: `run.cmd` (running supervisors read it by byte offset), `teszt.ps1`, `setup.ps1`,
  `kit.psd1` (they register or switch the tasks), `README.txt` and every secret or env file are never
  replaced. When the deployed commit's `run.cmd`, `teszt.ps1`, `setup.ps1` or `kit.psd1` differs from the
  installed one (line endings ignored), `deploy.log` gets one `kit: <file> ... needs a manual update`
  line per file, once per commit (`kit-notice.txt` remembers it); copy the file by hand with the kit off.
- Not when run from the clone: a `deploy.py` inside the repository (`deploy/local-test` itself as the
  kit) never overwrites the working tree.
- Kits installed before 2026-10-29 run a `deploy.py` without this code, so it cannot update itself:
  once the commit that added the self-update is deployed (`deployed-sha.txt`), copy
  `deploy/local-test/deploy.py` into the kit folder by hand; from then on the kit keeps itself current.

Everything runs windowless: the tasks start `conhost.exe --headless`, and `deploy.py` starts git
and docker with `CREATE_NO_WINDOW`. Docker Desktop starts only at sign-in, so the site needs a
logged-in user.

## 3. Turn it on

Docker Desktop must be running (`docker info` succeeds). In PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.arsm\tunnel\teszt.ps1" on
```

It sets the containers to restart `unless-stopped` and starts `arsm-tunnel-postgres` and
`arsm-tunnel-rustfs`, then `arsm-tunnel-api` and `arsm-tunnel-web`, waits until
`http://127.0.0.1:18080/alive` answers 200, enables and starts the gate and tunnel tasks, enables the
deploy task, and waits for `http://127.0.0.1:18081/alive` (200) and `https://teszt.arsm.hu/` (401 = up,
gate closed without the token). The switch is persistent: from then on the instance also comes back
after a logon, a reboot or a Docker restart, until `teszt.ps1 off`. The deploy task catches up with
the newest green `main` commit on its next run (a backup is taken first).

## 4. Turn it off

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.arsm\tunnel\teszt.ps1" off
```

It disables the three tasks (no start at logon, no 5-minute deploy), kills each process tree of the
kit (found by the kit folder in the command line, because `Stop-ScheduledTask` alone leaves the
children of `conhost` running; a killed deploy run's `deploy.lock` is removed), stops
`arsm-tunnel-web` and `arsm-tunnel-api`, then `arsm-tunnel-postgres` and `arsm-tunnel-rustfs` (60 s
timeout), and sets their restart policy to `no`. The switch is persistent: nothing of the instance
starts again, not at logon, not on the deploy trigger and not after a Docker or PC restart, until
`teszt.ps1 on`. It never stops every `node.exe` or `cloudflared.exe`: other gates and tunnels run on
the same machine.

Check it with `teszt.ps1 status`: tasks (enabled / running), process trees per service, containers
(state and restart policy) and the three health checks, ending with `State: ON`, `OFF` or `PARTIAL`.
Off means every task disabled, no process, every container stopped with restart `no`.

To pause only the auto-deploy: `Disable-ScheduledTask -TaskPath '\Automations\' -TaskName 'ARSM teszt - Deploy'`
(`teszt.ps1 on` enables it again).

## 5. Token gate

- Token: `GATE_TOKEN` in the repository-root `.env` (gitignored), at least 32 characters, different
  from the production `ARSM_PROD_GATE_TOKEN`. `setup.ps1` generates one when it is missing.
- Access: open `https://teszt.arsm.hu/?access=<token>` once per browser (or use the form on the gate
  page); it sets the `__Host-arsm_gate` cookie for 30 days. Print the link in PowerShell from the
  repository root: `"https://teszt.arsm.hu/?access=" + (Select-String .env '^GATE_TOKEN=(.+)$').Matches[0].Groups[1].Value`.
- Rotation: write a new value (or delete the line and re-run the setup); every older cookie stops
  working at once. Without a usable token the gate answers 503.
- Limits: 5 wrong tokens per IP per 15 minutes (in memory, per client only, no global limit), then 429.

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

Prerequisites: Docker Desktop, Node.js 20.6 or newer (the gate uses `node --env-file`), Python 3,
Git, a clone of this repository with its local `/.dockerignore` (the build-context allow-list that
`deploy.py` copies), and a Cloudflare zone that is Active.

1. Create the kit folder `%USERPROFILE%\.arsm\tunnel` and copy into it `deploy.py`, `setup.ps1`,
   `run.cmd`, `teszt.ps1` and `kit.psd1` from `deploy/local-test`. The setup copies the gate
   (`deploy/gate/gate.mjs`, `gate-page.mjs`, `gate-style.mjs`, `gate-assets/`) into the kit when it
   has none. Put `cloudflared.exe` into `bin\`.
2. Copy each `*.env.example` of `deploy/local-test` into the kit as `tunnel.env`, `api.env`,
   `postgres.env` and `rustfs.env`, and fill in real values (the passwords and keys must match across
   the files, as the placeholders say). Never commit them.
3. `cloudflared tunnel login` and keep the origin certificate of the zone as
   `%USERPROFILE%\.cloudflared\cert-arsm.pem` (one file per zone: `cert.pem` is overwritten by every login).
4. In PowerShell (no administrator rights needed):
   `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.arsm\tunnel\setup.ps1" -RepoPath <repository path>`
   (optional: `-HostName`, `-TunnelName`, `-OriginCert`, `-Off`). It starts Docker Desktop if needed,
   turns the kit off while it works, creates the tunnel when `<tunnel>.json` is missing, (re)points the
   DNS record at it, writes and validates `cloudflared.yml`, saves `ARSM_REPO` and `PUBLIC_URL` in
   `tunnel.env` (running `deploy.py --force` when the URL changed), ensures `GATE_TOKEN` and `gate.env`,
   registers the three tasks in `\Automations\` (disabled; same settings as the MaKoncert kit), removes
   tasks with the pre-2026-10-20 names (`ARSM teszt gate`, `ARSM teszt tunnel`, `ARSM mini-prod deploy`
   in the root folder; one registered from an elevated shell needs an elevated
   `Unregister-ScheduledTask`), runs `teszt.ps1 on` (or `teszt.ps1 off` with `-Off`) and prints the
   secret login link.
5. On a fresh machine `PUBLIC_URL` is new, so the setup runs `deploy.py --force` (green CI required),
   which creates the network, volumes and containers and bootstraps the admin from `ADMIN_PASSWORD` on
   the empty database; further users are registered by the admin in the app. If that deploy failed,
   `teszt.ps1 on` stops at the missing containers: fix the cause (`deploy.log`), run
   `python deploy.py --force` in the kit folder, then `teszt.ps1 on`.

Changing the hostname: re-run the setup with `-HostName <host>` (and the matching `Health` URL in
`kit.psd1`); it updates `cloudflared.yml`, the DNS route and `PUBLIC_URL`, and redeploys (the web
image bakes the URL into its CSP, the API gets it as CORS origin).

## 8. Removing it completely

Turn it off (section 4), then `docker rm` the four containers, `docker volume rm arsm-tunnel-pgdata
arsm-tunnel-rustfs arsm-tunnel-dpkeys`, `docker network rm arsm-tunnel-net`, unregister the three tasks
(`Unregister-ScheduledTask -TaskPath '\Automations\' -TaskName '<name>' -Confirm:$false`), and delete
the tunnel with `cloudflared --origincert <cert> tunnel delete arsm-teszt` plus its DNS record in
Cloudflare. The volumes and backups hold the only copy of the test data.
