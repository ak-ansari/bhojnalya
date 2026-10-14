# 08 API skeleton: Nest bootstrap, tenant transaction, errors, idempotency, healthz

Status: resolved
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

## Comments

- **Caddy does not route `/healthz`** (`infra/Caddyfile` only proxies `/api`
  and `/socket.io`). The API serves it at the root as TRD §16 says; the
  uptime check either hits the API directly or Caddy gets a `/healthz` route.
  Outside this ticket's scope.
- **Error codes:** a reused idempotency key answers `CONFLICT` with
  `details.idempotencyKey`, and an unreachable database answers 503
  `INTERNAL_ERROR`. `packages/contracts` may want `IDEMPOTENCY_KEY_REUSED`
  and `SERVICE_UNAVAILABLE`; I did not add them (not my workspace).

## Answer

The NestJS 11 API skeleton in `apps/api`, the `idempotency_keys` table and the
job queue's schema in `packages/db` (migration `0003_api_idempotency_jobs`),
and a real `api` + `migrate` service in `infra/docker-compose.yml`.

**What's there**

- `createApp({ config, imports?, logDestination? })` (`src/app.ts`) builds the
  app that `main.ts` listens on and that the integration tests use. Express,
  REST under `/api/v1`, `/healthz` at the root, `enableShutdownHooks`.
- Config is zod-validated env (`DATABASE_URL`, `PORT`, `DB_POOL_SIZE`=10,
  `LOG_LEVEL`, `NODE_ENV`), and the process refuses to start without it.
- **Request pipeline** (`src/platform/`), in order:
  1. pino-http through nestjs-pino. The request id is the caller's sane
     `X-Request-Id` or a new UUIDv7, echoed in the response header. Every
     completion line has `requestId`, `tenantId`, `outletId` and `deviceId`.
  2. Guards. Ticket 13's auth guard sets `req.principal`
     (`{ tenantId, outletIds, outletId?, deviceId?, userId? }`).
  3. `TenantTransactionInterceptor`: unless the route is `@Public()`, it
     requires a principal (otherwise 401) and runs the rest inside
     `withTenant` on the app_user pool. Handlers get the transaction with
     `@TenantTx()`.
  4. `SuspendedOutletInterceptor` (the "suspended-outlet guard"): a non-GET
     for a suspended `principal.outletId` gets 402 `OUTLET_SUSPENDED`. Routes
     marked `@AllowWhenSuspended()` pass (ADR 0015), and an outlet the
     tenant can't see gets 403.
  5. `IdempotencyInterceptor`: a non-GET with `Idempotency-Key` claims
     `(tenant, key)` with `INSERT … ON CONFLICT DO UPDATE WHERE expired` in
     the same transaction, stores status + body, and replays with
     `Idempotent-Replayed: true`. A different request under the same key gets
     409 `CONFLICT`. Concurrent duplicates block on the row and then replay.
     A failed request rolls back, so nothing is stored.
  6. `ErrorEnvelopeFilter`: `ApiError`, Nest HttpExceptions and body-parser
     errors all become `{ code, message, details?, requestId }`. Anything
     else is 500 `INTERNAL_ERROR` with a fixed message.
- **Validation and OpenAPI:** `@ZodBody/@ZodQuery/@ZodParams(schema)` validate
  through `ZodValidationPipe` and record the schema; `@Returns(status, desc,
  schema)` records responses. `GET /api/v1/openapi.json` builds OpenAPI 3.1
  with `@asteasolutions/zod-to-openapi` by walking the controllers.
- `GET /healthz` runs `SELECT 1` on the pool: 200 `{status:'ok',db:'ok'}`,
  otherwise 503.
- pg-boss 12 runs in-process as app_user (`JOBS` token, its own pool of 2,
  `migrate:false`). There are no queues yet.
- `node dist/migrate.js` (`MIGRATION_DATABASE_URL`, run as the owner) runs
  the SQL migrations, then installs pg-boss into the `pgboss` schema.
- Docker: `apps/api/Dockerfile` (built from the repo root) and
  `Dockerfile.dockerignore`. Compose has a one-shot `migrate` service (the
  only one with the owner URL), then `api` (app_user, healthcheck on
  `/healthz`), with no profile. The image is `node:22.23.1-alpine`, since
  testcontainers 12 needs Node 22.22 or later for `pnpm install`. I
  smoke-tested it on an isolated network: migrate exits 0, `/healthz` answers
  200, an unknown route gets the 404 envelope, and the logs are JSON.
- Tests: 8 unit tests and 25 integration tests (Testcontainers, the same
  roles script, the API's own migrate step, the real app as app_user with a
  test-only header guard and probe routes in `src/testing/`). Every
  integration test was seen red by breaking the code on purpose: no
  transaction, missing principal check, customProps, filter unregistered,
  suspension check, read-method and allow-list bypass, healthz without a
  query, pg-boss not started, OpenAPI metadata dropped, claim after the
  handler, hash check removed, expiry never reclaimed, key validation
  removed, commit-on-error, and a key-only primary key. Cases `api 0001`–`0008`
  are in `apps/api/docs/test-cases/`.

**Decisions**

- **ADR 0020 (Proposed):** pg-boss gets its own schema, created by the
  migration. The owner installs and upgrades its tables in the migrate step.
  Default privileges give app_user DML, so the running API (as app_user)
  owns nothing and runs no DDL. This keeps the db isolation test's "app_user
  owns 0 tables" true. Queues on the shared job table can be created by
  app_user (tested). A queue with `partition: true`, or a pg-boss upgrade
  that defers index builds to a running instance, needs the owner in the
  migrate step.
- Suspension and idempotency are interceptors, not Nest guards, so they run
  after the auth guard and inside the request's own transaction (one round
  trip, no guard-ordering dependency).
- Every route is tenant-scoped unless `@Public()` (fails closed with 401).
- No `emitDecoratorMetadata`: every injection uses an explicit `@Inject(token)`,
  so Vitest's esbuild and tsc agree.
- Idempotency keys are tenant-wide, not outlet-scoped. The request hash covers
  method, URL and JSON body. A replay answers with the route's own status
  code (Nest re-applies it), so routes must not set status dynamically.
  `response_body` is `json`, not `jsonb`, so key order is kept. Expired keys
  are reclaimed in place. A purge job (platform_admin has DELETE) is not built.
- The key is optional: a request without one runs unguarded. Requiring it for
  device and guest principals is for ticket 13/20.
- NestJS pinned to 11.2.6 (12.x exists; the TRD says 11).

**Notes for later tickets**

- Ticket 13: register the auth guard as `APP_GUARD` and set `req.principal`,
  including `outletId` (the acting outlet) for suspension. Mark sign-in routes
  `@Public()`. Replace `src/testing/test-app.ts`'s header guard only in tests.
- Ticket 17: mark `POST /sync/push` `@AllowWhenSuspended()`.
- Jobs: inject `JOBS` (PgBoss). Enqueue from `app/` inside the request
  transaction with pg-boss's `fromDrizzle` adapter if it must be atomic.
- Integration test template: `src/testing/global-setup.ts` + `createTestApp`
  + `agentFor`. `pnpm --filter @bhojnalya/api test:int`.

**Proposed `docs/log.md` entry**

```markdown
## 2026-10-14 — the API skeleton

- **Creation**: `apps/api` NestJS 11 skeleton: every non-public request runs in
  one tenant transaction, a suspended outlet's changes get 402, the
  `Idempotency-Key` replay is stored in the same transaction for 24 h, one
  error envelope, Pino logs with request/tenant/outlet/device ids, OpenAPI
  from Zod, `/healthz`, and pg-boss in-process (ticket 08). Cases
  `api 0001`–`0008`. `packages/db` migration `0003_api_idempotency_jobs`.
  ADR 0020: the job queue is installed by the owner and run as app_user.
  Compose now builds and runs `migrate` and `api` by default.
```
