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
- From ticket 03: re-validate with the payload's `outletTaxRateBp` snapshot (added in ticket 27), never the outlet's current rate.
- Re-run the engine on lines in a deterministic order anyway (ORDER BY line position), though ticket 27 makes totals order-independent.

## Notes from ticket 16

- The device stores and pushes ops in wire form (ADR 0025). The pushed body for the fixture flow equals `packages/contracts/fixtures/sync-push.json` exactly; make the server's contract test parse that same file.
- A refused op is held on the device until staff retry, so the server **will see holes in a device's `deviceSeq`**. Apply in order without requiring contiguity, and answer **every** op in a batch (acked or rejected).
- Scope the idempotent skip on `sync_ops.op_id` to the tenant: a cross-tenant duplicate op id must never silently drop another tenant's op (QA round 1).

## Notes from QA round 2

- **Retried refused ops arrive out of `deviceSeq` order.** The device holds refused ops (ADR 0025) and pushes the rest; on retry, seqs 1–2 arrive after 5 was applied. Decide in an ADR: the server accepts late lower seqs (ops are idempotent; `order.upsert` is last-writer-wins on `updatedAt`, invoices and payments never conflict). Recommended, so the device never re-sequences.
- **Concurrent duplicates:** two tabs can push the same `op_id` at once. Inserting a duplicate concurrently must answer `acked`, never 5xx (`INSERT ... ON CONFLICT (tenant_id, op_id) DO NOTHING` then read back).
- Answer **every** op in a batch, with `reason` always a contract `ErrorCode`.
- Pull (`GET /sync/pull?cursor=`) and its cursor are still unbuilt on the device. Build the server side here; the device side goes with ticket 18.
