# 08 API skeleton: Nest bootstrap, tenant transaction, errors, idempotency, healthz

Status: ready-for-agent
Type: task
Blocked by: 02, 05, 06
Workspaces: apps/api

## What

The cross-cutting machinery every endpoint relies on (TRD §4.1, §5.2, §14, §16). Load `api-code`.

## Acceptance

- NestJS 11 on Node 22, `/api/v1` prefix, Pino JSON logs with `requestId`, `tenantId`, `outletId`, `deviceId`.
- Zod validation pipe using `packages/contracts`; OpenAPI generated from Zod.
- Global exception filter → `{ code, message, details?, requestId }`.
- Tenant-context interceptor: every request runs in `withTenant` from `packages/db`; connection pool as `app_user`, size 10.
- `Idempotency-Key` interceptor storing responses for 24 h (an `idempotency_keys` table with tenant RLS; the migration goes in packages/db, the only cross-workspace edit allowed here).
- Suspended-outlet guard: non-GET returns 402 with a clear code (ADR 0015; read it).
- `GET /healthz` pings the DB.
- pg-boss started in-process (no jobs yet).
- Integration tests against real Postgres for: tenant context set, error shape, idempotent replay returns the stored response.
- Add `api` to the compose file's default profile.
