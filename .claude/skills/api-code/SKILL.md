---
name: api-code
description: House rules for writing code in apps/api (NestJS, Drizzle, Socket.io, pg-boss) and packages/db (schema, migrations, RLS). Use when adding or changing an endpoint, use case, table, migration, policy, job, webhook, socket event or sync behaviour.
---

# API code

How code is written in `apps/api` and `packages/db`. **Tenant isolation,
append-only money and idempotent sync are P0**: a bug in any of them is a
compliance or data-loss bug, not a defect. Layering adapted from ghatnaghar's
backend: dependencies point inward, and only adapters touch storage.

## Steps

1. **Place it** per the layout below. Done when every new file sits in its
   layer and no import points outward.
2. **Write it** to the reference below.
3. **Test it** with the `test-case` skill. Domain rules are unit tests.
   Anything whose truth is Postgres's — RLS, grants, constraints,
   transactions, idempotency, ordering, job retry — is an **integration** test
   against a real Postgres, connected as the application role. Wire shapes
   another workspace reads are **contract** tests against
   `packages/contracts/fixtures/`. Break each new test's code on purpose and
   watch it go **red**. Done when every behaviour has a test seen red and its
   case is in `apps/api/docs/test-cases/`.
4. **Record decisions** with the `adr` skill.
5. **Verify.** Typecheck, `pnpm test`, `pnpm test:integration`. Done when all
   pass and the RLS coverage test is green (it fails on any tenant table
   without the policy).

## Reference

### Layout

```
apps/api/src/
  modules/<feature>/
    http/        controllers, request/response DTOs from packages/contracts.
                 Translate only — no business rules.
    app/         use cases. Declares the ports it needs (OrderStore, Clock, …).
    domain/      pure types and rules. Imports nothing from this app.
    postgres/    repositories implementing the ports. The only code that queries.
    jobs/        pg-boss handlers (enqueue from app/, never from http/)
    realtime/    socket emitters for this feature
  platform/      tenancy (request transaction + set_config), db, auth, errors,
                 jobs, realtime, audit, config, logging. Never imports a feature.
  modules/platform-admin/
                 the only cross-tenant code path; every call audit-logged
packages/db/
  schema/        Drizzle schema
  migrations/    SQL, committed. A merged migration is never edited.
  policies/      RLS policies and grants, one file per table family
```

`http` → `app` → `domain`; `postgres`/`jobs`/`realtime` → `domain`.

### Tenancy (P0)

- **Every request runs in one transaction** opened by the platform's tenancy
  layer, which does `set_config('app.tenant_id', …, true)` and
  `app.outlet_ids` first. A repository receives that transaction; it never
  opens a connection or a transaction of its own.
- The app connects as `app_user` (no `BYPASSRLS`). Migrations run as the
  owner, in a separate step.
- **Every new tenant table** gets `tenant_id` (plus `outlet_id` if
  outlet-scoped), the `tenant_isolation` policy, and `FORCE ROW LEVEL
  SECURITY`, in the same migration that creates it.
- Cross-tenant reads exist only in `platform-admin`, and each writes an audit
  row in the same transaction.
- Schema keeps Tenant → Outlet → Floor → Table even where the MVP UI shows
  one of each.

### Money and the financial tables (P0)

- `bigint` paise in the schema, the DTOs (as strings on the wire, parsed to
  `bigint`) and the code. No `numeric` maths in SQL for totals the engine
  owns.
- `invoices`, `invoice_lines`, `payments`: **no UPDATE or DELETE grant**.
  Cancellation inserts into `invoice_cancellations`; status is a view.
- Orders, KOTs and invoices **snapshot** item name, price, tax rate and HSN.
  Never join back to the menu to print or report an invoice.
- The server **re-runs `packages/billing`** on every synced invoice; a
  mismatch is stored and flagged `needs_review`, never rejected or dropped.

### Sync

- `POST /api/v1/sync/push`: idempotent on `sync_ops.op_id`; ops applied in
  `deviceSeq` order; at most 200 per batch; the whole batch's outcome is
  per-op, so one bad op does not lose the others.
- `GET /api/v1/sync/pull?cursor=`: cursor-paginated, stable ordering.
- Every mutating endpoint honours `Idempotency-Key`.

### HTTP

- REST under `/api/v1`. Zod validates every body, query and param through the
  shared pipe; OpenAPI is generated from the same schemas.
- Errors are `{ code, message, details?, requestId }`. Codes are
  `SCREAMING_SNAKE_CASE`, defined once in `packages/contracts`, asserted as
  literals in tests.
- Lists use cursor pagination. Suspended outlets: any non-GET returns 402/403
  from one guard, not per handler.
- Time is `timestamptz` (UTC). Business day and FY are computed in
  `Asia/Kolkata` from an injected clock, with the outlet's day-end cut-off.

### Realtime and jobs

- A socket event is a **notification**: its payload is IDs and a type, never
  the data a client should trust. Clients refetch.
- Event names and payloads come from `packages/contracts`. Rooms are
  `outlet:{id}`, `outlet:{id}:kds`, `session:{tableSessionId}`.
- Webhooks verify the signature, store the raw payload, enqueue a job and
  return 200. Processing and every outbound aggregator call run as pg-boss
  jobs with retry and backoff, behind the `AggregatorAdapter` interface.

### Dependencies

- No Redis, no external queue, no new paid service. Adding one is an ADR that
  names the TRD §15.5 trigger that fired.

### Naming and comments

- As in `web-code`: `SCREAMING_SNAKE_CASE` constants, PascalCase classes and
  types, camelCase otherwise; snake_case in SQL and on the wire.
- Comments are one line of *why*, citing the TRD where it explains the code.
  A decision worth arguing about is an ADR.
