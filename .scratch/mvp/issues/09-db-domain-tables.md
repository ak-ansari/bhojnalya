# 09 DB: menu, ordering, kitchen, billing, aggregator, sync, reporting tables

Status: ready-for-agent
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
