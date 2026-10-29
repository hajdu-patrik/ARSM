# Deploy Rules

## Scope

- Applies to `deploy/**`: the Azure production kit (`azure/*.bicep`, `api.Dockerfile`, `web.Dockerfile`, `nginx/`,
  `gate/`, `extract-csp.mjs`), the local test instance kit (`local-test/`) and the guides in `docs/`.
- `scripts/deploy-azure.py` drives the Azure kit (rules in `scripts/CLAUDE.md`), `local-test/deploy.py` the test instance.

## Core Rules

- Production (`arsm.hu`) is deployed by the owner by hand, from a committed sha; nothing deploys it automatically.
  Agent sessions run the Azure steps of `deploy-azure.py` (`registry`, `images`, `infra`, `bind-domain`, `release`)
  only when the owner explicitly permits it in that same message; otherwise at most `check` and `--dry-run` (owner
  decision, 2026-10-29). `teszt.arsm.hu` is the auto-deployed test instance.
- Images are built from a `git archive` of the commit, so only committed files reach them.
- Secrets never enter the tree: the real values live in the gitignored root `.env`, and only `*.example`
  placeholders of the kit's secret files are tracked (`local-test/.gitignore` keeps its real `*.env`, tunnel
  credentials, certificates, backups and logs out).
- Mail (Resend) reaches the API as `Email__*` settings from `main.bicep` (secret `resend-api-key`, params in
  `main.bicepparam`), fed by the root `.env` keys `ARSM_RESEND_API_KEY`, `ARSM_MAIL_FROM`, `ARSM_MAIL_REPLY_TO`.
- The two gate tokens differ: `GATE_TOKEN` (teszt) and `ARSM_PROD_GATE_TOKEN` (production).
- One host name serves the WebUI and the API because the CSRF cookie is host-only: the API has no public ingress,
  Nginx is the single entry and the gate sits in front of it.
- The API runs one replica at most (its rate limiter is in-process): `maxReplicas: 1` stays in `main.bicep`.
- The client address chain (Azure ingress, gate, Nginx `real_ip`, the API's `ForwardedHeaders` with
  `ForwardLimit=2`) changes only as a whole: section 3 of `docs/deployment-azure.md`.
- `nginx/default.conf.template`: regex locations match in file order, so a narrow API route goes above the
  catch-all; the directives the locations share live in `api-proxy.conf`.
- The gate has one code base, `gate/`: it runs the tunnel gate and, with `GATE_MODE=azure`, the Azure sidecar. Its
  Node major stays equal to the one in `web.Dockerfile`.

## Validation

- Nothing in CI builds the kit: rehearse an image or Nginx change locally (`docs/deployment-azure.md`, section 9).
- A change to the kit updates its guide in `docs/` and the `deploy-azure.py` entry in `scripts/CLAUDE.md`; a change to
  the setup also updates `README.md` and `README(HU).md`.
