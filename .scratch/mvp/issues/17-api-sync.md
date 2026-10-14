# 17 Sync API: push/pull, server re-validation, needs_review, gap alerts

Status: ready-for-agent
Type: task
Blocked by: 03, 04, 13
Workspaces: apps/api, packages/contracts (fixtures only)

## What

Invariants 2, 6, 7 on the server (TRD §8.3, §7). Load `api-code` and `billing-engine`.

## Acceptance

- `POST /api/v1/sync/push`: idempotent on `sync_ops.op_id` (replay → acked, not re-applied); ops applied in `deviceSeq` order in one transaction per batch; ≤ 200 ops.
- `invoice.create`: re-runs `computeInvoice`; on mismatch store **as issued** with `needs_review = true` and alert the owner. Never drop.
- Validates invoice number format, FY and device code belong to the calling device; updates `device_invoice_counters`; a gap raises an alert (audit + owner-visible flag).
- Suspended outlet: push still accepted for already-issued invoices (read ADR 0015 for exactly what is allowed).
- `GET /api/v1/sync/pull?cursor=`: menu/table/order/stock changes since an opaque cursor.
- Integration tests: same batch 3× → each invoice exactly once; out-of-order deviceSeq applied in order; mismatch stored + flagged; gap detected.
- Contract test: the fixture from ticket 02 parsed by the server.
