# 06 Infra: local dev Docker Compose

Status: ready-for-agent
Type: task
Blocked by: 01
Workspaces: infra

## What

TRD §15.1–15.2 local environment: `infra/docker-compose.yml` with `postgres` (16, tuned per §15.2) and `caddy`; `api` service stubbed behind a profile until ticket 08 lands.

## Acceptance

- `docker compose -f infra/docker-compose.yml up postgres` gives a DB with the migration-owner and `app_user` credentials from `.env`.
- `infra/.env.example` documents every variable; `.env` is gitignored.
- `infra/Caddyfile` reverse-proxies `/api` and `/socket.io` to `api:3000`.
- `infra/scripts/README.md` lists the backup/restore/deploy scripts as TODO (wal-g comes later, not in this ticket).
- Root `package.json` script `db:up` / `db:down`.
