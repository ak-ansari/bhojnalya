# infra/scripts

Operational scripts for the VPS (TRD §15.2–15.3). None exist yet; each row
below is a TODO for a later ticket. WAL-G is not part of the local stack.

| Script | Does | Status |
| --- | --- | --- |
| `backup.sh` | Nightly `pg_dump` to R2, the logical second restore path beside WAL-G | TODO |
| `wal-g` sidecar/cron | Continuous WAL archiving + nightly base backup to R2 (PITR 14 days, 8 weekly, 6 monthly) | TODO |
| `restore.sh` + `restore.md` | Point-in-time restore from WAL-G into staging; the monthly restore-drill runbook | TODO |
| `deploy.sh` | `docker compose pull && up -d`, run migrations as `bhojnalya_owner`, then check `/healthz` | TODO |

## Local database

From the repo root, after copying `infra/.env.example` to `infra/.env`:

```sh
pnpm db:up        # postgres 16; returns once app_user can log in
pnpm db:down      # stop; `pnpm db:down -v` also wipes the volume
psql "postgres://app_user:<APP_USER_PASSWORD>@127.0.0.1:5432/bhojnalya"
```

`infra/postgres/init/01-roles.sh` creates the roles (`bhojnalya_owner`,
`app_user`, `platform_admin`) and the database only when the volume is empty.
