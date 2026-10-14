# 06 Infra: local dev Docker Compose

Status: resolved
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

## Answer

`infra/docker-compose.yml` (project `bhojnalya`) runs `postgres:16.10-alpine`
tuned per TRD §15.2 (`shared_buffers=512MB`, `work_mem=8MB`,
`max_connections=50`, `timezone=UTC`) and `caddy:2.10.2-alpine`. The `api`
service sits behind the `api` profile as a `node:22.20.0-alpine` stub that
answers 503 `{code:"NOT_BUILT"}` on :3000, so the Caddy routes can be
exercised now. Ticket 08 swaps `image`/`command` for `build`. Caddy
reverse-proxies `/api*` and `/socket.io*` to `api:3000` and 404s everything
else. `pnpm db:up` runs `up -d --wait postgres`, and `pnpm db:down` runs
`--profile "*" down`. A plain `down` leaves profiled containers running; pass
`-v` to wipe the volume.

**Roles** (created by `infra/postgres/init/01-roles.sh`, as the bootstrap
superuser `postgres`, on the first start of an empty volume):

| Role | Attributes | Purpose |
| --- | --- | --- |
| `postgres` | superuser | bootstrap only; nothing in the app uses it |
| `bhojnalya_owner` | LOGIN, NOSUPERUSER, NOBYPASSRLS | owns database `bhojnalya` (and so `public`); runs migrations |
| `app_user` | LOGIN, NOSUPERUSER, NOBYPASSRLS | API connections; CONNECT + USAGE on `public` only |
| `platform_admin` | LOGIN, NOSUPERUSER, **BYPASSRLS** | audited cross-tenant module only; CONNECT + USAGE only |

**Env vars** (`infra/.env.example`; `.env` is gitignored by the root
`.gitignore`): `POSTGRES_PASSWORD`\*, `DB_OWNER_PASSWORD`\*,
`APP_USER_PASSWORD`\*, `PLATFORM_ADMIN_PASSWORD`\*, `DB_NAME` (default
`bhojnalya`), `POSTGRES_PORT` (5432), `CADDY_HTTP_PORT` (8080), plus host-side
`DATABASE_URL`, `MIGRATION_DATABASE_URL` and `PLATFORM_ADMIN_DATABASE_URL`.
Compose refuses to start without the ones marked \*. The api container gets
the same three URLs, pointing at host `postgres`.

**Decisions**

- Role names are fixed in the init script, not configurable. They are a
  contract with `packages/db`. **Ticket 05's migrations must use
  `bhojnalya_owner`, `app_user` and `platform_admin` exactly.** They must also
  grant table privileges to `app_user`/`platform_admin`, for example with
  `ALTER DEFAULT PRIVILEGES FOR ROLE bhojnalya_owner`. The init script grants
  nothing on tables.
- `platform_admin` gets BYPASSRLS here because only a superuser can grant it,
  and migrations run as the owner, who can't.
- The owner is not a superuser and has no BYPASSRLS, so FORCE RLS binds it
  too (ADR 0005).
- Ports are bound to 127.0.0.1 only. The healthcheck logs in as `app_user`, so
  `--wait` returns only after the init script has finished.
- No test-case catalogue for infra. The role promises (app_user cannot bypass
  RLS or own tables) are falsified by ticket 05's Testcontainers isolation
  test, which is the lowest level that can check them.

**Verified**: `docker compose config --quiet` is OK with and without
`--profile api`. `caddy validate` reports a valid configuration. `pnpm db:up`
reports `Healthy`. psql as `app_user` with the `.env` password through the
published port returns `current_user = app_user`, PostgreSQL 16.10. Settings
are 512MB / 8MB / 50 / UTC. `app_user` gets "permission denied for schema
public" on CREATE TABLE. `bhojnalya_owner` can create tables. A wrong password
is rejected. Through Caddy, `/api/v1/healthz` and `/socket.io/` reach the stub
(503) and `/other` returns 404. `pnpm db:down` removes all containers.
`pnpm check --force` passes 32/32.

Proposed `docs/log.md` line: `2026-10-14: infra local dev stack: Postgres 16
(§15.2 tuning) with bhojnalya_owner/app_user/platform_admin roles from an init
script, Caddy proxying /api and /socket.io, api stub behind a profile,
pnpm db:up/db:down (ticket 06).`
