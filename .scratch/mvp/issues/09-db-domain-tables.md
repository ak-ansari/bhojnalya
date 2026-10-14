# 09 DB: menu, ordering, kitchen, billing, aggregator, sync, reporting tables

Status: resolved
Type: task
Blocked by: 05
Workspaces: packages/db

## What

The rest of TRD §5.3, using the RLS helper from ticket 05.

## Acceptance

- Menu: `menu_categories`, `menu_items` (veg marker, price paise, gst_rate, hsn_sac, is_active, in_stock, ext_ref jsonb), `modifier_groups` (min, max, is_variant), `modifiers`, `item_modifier_groups`, `menu_versions`.
- Ordering: `table_sessions`, `orders` (channel, type, status, updated_at), `order_items` + `order_item_modifiers` with snapshotted name/price/tax/HSN.
- Kitchen: `kots` (per-device per-business-day number, see US-KDS-07), `kot_items`.
- Billing: `invoices` (invoice_no, device_id, fy, place_of_supply, needs_review, totals), `invoice_lines`, `invoice_tax_lines`, `payments`, `invoice_cancellations`, view `invoices_with_status`. `UNIQUE (outlet_id, invoice_no)`.
- **Append-only:** `app_user` has INSERT/SELECT only on `invoices`, `invoice_lines`, `invoice_tax_lines`, `payments`, `invoice_cancellations`. Integration test proves UPDATE/DELETE fail as `app_user`.
- Aggregators: `aggregator_links`, `aggregator_orders` (UNIQUE provider + ext_order_id), `aggregator_events` (raw payload).
- Sync: `sync_ops` (op_id PK), `device_invoice_counters`.
- Reporting: `daily_sales_rollup`; index `(outlet_id, business_date)`.
- The isolation test from 05 passes over all new tables without edits.

## Answer

The rest of TRD §5.3 is in `packages/db`: 23 new tables, the
`invoices_with_status` view and one more pre-sign-in lookup, all in migration
`0002_domain_tables`. The isolation test from 05 covers every new table
without being edited, and passes.

**What's there**

- Schema files `src/schema/{menu,ordering,kitchen,billing,aggregators,sync,reporting}.ts`.
  The migration is generated. Two things were done by hand: the new parent
  keys `tables (tenant_id, outlet_id, id)` and `devices (tenant_id, outlet_id, id)`
  were moved to the top of the file, because drizzle-kit put them after the
  foreign keys that use them; and RLS, the view, grants and the resolver were
  appended at the end.
- **Every new table is outlet-scoped**, with `app.enable_tenant_rls(t, 'outlet_id')`.
  ADR 0014 says menus, orders, invoices and reports are always per outlet,
  and the isolation test treats any table with an `outlet_id` as
  outlet-scoped. Children carry `tenant_id` and `outlet_id` and reference
  their parent by `(tenant_id, outlet_id, id)`, so a row can't point into
  another outlet.
- Grants (app_user):
  - SELECT/INSERT only: the five financial tables, `sync_ops` and `kot_items`.
  - S/I/U: `orders`, `table_sessions`, `kots`, `menu_versions`, the aggregator
    tables and `device_invoice_counters`.
  - S/I/U/D: menu tables, `order_items`, `order_item_modifiers` and
    `daily_sales_rollup`.
  - `platform_admin` gets SELECT only on everything new.
- `invoices_with_status` (`security_invoker = true`): id, tenant/outlet,
  order_id, device_id, invoice_no, fy, issued_at, business_date,
  grand_total_paise, needs_review, `status` (`issued`|`cancelled`),
  cancelled_at, cancellation_reason and `paid_paise` (the sum of payments).
- `app.resolve_aggregator_store(provider, ext_store_id)` → tenant, outlet and
  link id, through `resolveAggregatorStore` (ADR 0021).
- Tests: `src/domain.int.test.ts` (12 integration), 1 new case in
  `pre-auth.int.test.ts`, and `src/schema/enums.test.ts` (8 unit; pg enums
  equal the contracts enums, which adds a `@bhojnalya/contracts` devDependency).
  I saw every new test fail by breaking the migration on purpose, in two
  batches plus one enum change. One test needed a combined break:
  `invoices_with_status` stays green when only `security_invoker` is dropped,
  because FORCE RLS also binds the view's owner. It goes red when
  `security_invoker` is dropped and FORCE is removed. Cases `db 0007`–`0014`
  are new; `db 0004` now covers the aggregator lookup.

**Decisions**

- **ADR 0021 (Proposed):** a webhook finds its outlet through a fifth
  pre-sign-in lookup keyed by `(provider, ext_store_id)`. That makes
  `UNIQUE (provider, ext_store_id)` global across tenants.
- Order items, invoice lines and KOT items hold `menu_item_id` / `modifier_id`
  as plain uuids with **no foreign key** to the menu. A menu edit or delete
  can't reach them (snapshot rule), and the menu stays deletable.
- `invoices.order_id` has **no foreign key**: an invoice synced without its
  order is still stored (data is never dropped). `invoices.device_id` does
  have one, and it must be a device of the same outlet.
- `kot_items.order_item_id` has a foreign key, so an item already sent to the
  kitchen can't be deleted and has to be voided (`voided_at` + `void_reason`).
  `orders` has no DELETE grant; cancelling needs a `cancel_reason`.
- KOT numbers: `UNIQUE NULLS NOT DISTINCT (outlet_id, device_id, business_date, kot_no)`.
  A KOT made by the server (QR, aggregator) has `device_id NULL`, and those
  KOTs share one series per outlet per day.
- `aggregator_events.raw_body` is `text`, not jsonb, so the exact bytes can be
  signature-checked again on replay. Credentials are not stored;
  `aggregator_links.settings` is for non-secret settings only.
- `aggregator_provider` enum is `['urbanpiper']`, the middleware. The channel
  (`swiggy`/`zomato`) is on `aggregator_orders.channel` and `orders.channel`.
- No DB-level format checks on text columns such as `invoice_no` or `hsn_sac`.
  The isolation test fills required text columns with `synthetic-N`, which a
  regex CHECK would reject. The DB checks only length (`invoice_no` ≤ 16),
  digits on `char` columns (`fy`, `place_of_supply`) and non-negative amounts.
  `round_off_paise` has no ±50 bound, for the same reason. Contracts and the
  billing engine own the exact formats.
- `daily_sales_rollup` has PK `(outlet_id, business_date)`, which is the
  required index. It has headline bigint totals plus a `breakdown` jsonb for
  channel/rate/item/category (paise as strings); ticket 22 owns its shape.

**Notes for later tickets**

- Money columns end in `_paise` (bigint, Drizzle `mode: 'bigint'`). Rates are
  `*_rate_bp` integers.
- **15 menu:**
  - `menu_categories`, `menu_items` (food_type `veg|non_veg|egg`,
    price_paise, tax_rate_bp default 500, hsn_sac default `996331`,
    is_active, in_stock, image_url, ext_ref jsonb).
  - `modifier_groups` (min_select, max_select, is_variant; a CHECK requires
    min = max = 1 when is_variant), `modifiers`, `item_modifier_groups`
    (PK item_id + group_id).
  - `menu_versions` (PK outlet_id, version bigint): bump with
    `INSERT … ON CONFLICT (outlet_id) DO UPDATE SET version = menu_versions.version + 1`.
- **17 sync:**
  - `sync_ops` (op_id PK, device_id, device_seq UNIQUE per device, type enum
    = SYNC_OP_TYPES, entity_id, payload jsonb, op_created_at). Insert-only.
  - `device_invoice_counters` (PK device_id + fy, last_seq, last_invoice_no,
    invoice_count; a gap is `invoice_count < last_seq`).
  - `invoices`: needs_review, review_details jsonb, business_date,
    discount_kind/discount_rate_bp, service_charge_rate_bp/service_charge_taxed,
    and igst_paise default 0.
  - `invoice_lines`: line_no, unit_price_paise, quantity, tax_rate_bp,
    modifiers jsonb, discount_paise, taxable_value_paise, cgst/sgst/igst_paise.
  - `invoice_tax_lines` is UNIQUE (invoice_id, tax_rate_bp).
- **19 KOT:**
  - `kots` (kot_no, business_date, device_id nullable, status
    `new|preparing|ready`, preparing_at, ready_at).
  - `kot_items` (order_item_id, name, quantity, note).
- **20 QR:** `table_sessions` (status `open|closed`, at most one open per
  table, closed_at is set iff closed, guest_name/phone). `orders.status` is
  `pending|open|rejected|billed|settled|cancelled`, with `reject_reason` and
  `cancel_reason`.
- **21 aggregators:** `resolveAggregatorStore(db, provider, extStoreId)`.
  - `aggregator_links`: is_enabled default false, store_open, settings.
  - `aggregator_orders`: status
    `placed|accepted|rejected|food_ready|dispatched|delivered|cancelled`,
    accept_by, rider jsonb, rider_eta_at, order_id.
  - `aggregator_events`: headers, raw_body, processed_at, attempts,
    last_error.
- **22 reports:** read `invoices_with_status` or `invoices` by
  `(outlet_id, business_date)` (indexed). Cancellations are in
  `invoice_cancellations`.
- Ticket 08's `idempotency_keys` will also be migration `0002`. Whichever
  merges second regenerates its migration on top: re-run
  `drizzle-kit generate`, then carry over the hand-written head and tail of
  `0002_domain_tables.sql`.

**Proposed `docs/log.md` entry**

```markdown
## 2026-10-14 — the database holds the menu, orders, kitchen, bills, aggregator and sync data

- **Creation**: `packages/db` migration `0002_domain_tables`: menu, ordering,
  kitchen, billing (append-only, status derived by a view), aggregator, sync
  and reporting tables, all outlet-scoped under RLS. Test cases `db 0007`–`0014`;
  `db 0004` extended. ADR 0021 adds the aggregator store lookup before sign-in.
```
