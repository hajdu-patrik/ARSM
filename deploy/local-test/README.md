# Local test instance kit (teszt.arsm.hu)

Tracked, secret-free copy of the kit that runs the local test instance on the developer machine
(working copy: `%USERPROFILE%\.arsm\tunnel`). How it works, how to turn it on and off, backups and
first-time setup: [deploy/docs/deployment-local-test.md](../docs/deployment-local-test.md).

| File | Role |
| --- | --- |
| `teszt.ps1` | `on`, `off` or `status` of the whole kit; the switch is persistent (`off` disables every task and sets the containers to restart `no` until `on`). Generic: it reads `kit.psd1`. |
| `kit.psd1` | What `teszt.ps1` switches: the scheduled tasks, the containers in start order, the health checks. |
| `run.cmd` | Supervisor of the gate and the tunnel (`run.cmd gate`, `run.cmd tunnel`): restarts the process with backoff, logs into `logs\<service>.log`. |
| `deploy.py` | Auto-deploy of green-CI `main` commits into the `arsm-tunnel-*` containers, plus `pg_dump` backups. |
| `setup.ps1` | Idempotent one-command setup: tunnel, DNS route, `cloudflared.yml`, gate token, scheduled tasks, then `teszt.ps1 on` (or `off` with `-Off`). |
| `*.env.example`, `cloudflared.yml.example` | Placeholder templates of the real, gitignored kit files. |

The token gate is not duplicated here: it is [deploy/gate](../gate) (the same code runs the Azure
sidecar with `GATE_MODE=azure`). Real `*.env` files, tunnel credentials, certificates, backups, logs
and state files are gitignored in this folder and must never be committed.
