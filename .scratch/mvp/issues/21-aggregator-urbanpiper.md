# 21 Aggregators via UrbanPiper

Status: ready-for-agent
Type: task
Blocked by: 19
Workspaces: apps/api, apps/app

## What

Invariant 10, TRD §11, PRD A1–A6. **First on the cut list**, so build it after everything else in this wave.

## Acceptance

- `AggregatorAdapter` interface exactly as in TRD §11.1; `UrbanPiperAdapter` implementation; a `FakeAdapter` for tests.
- `POST /webhooks/aggregator/:provider`: verify signature + replay window, store raw payload, return 200 fast; processing in a pg-boss job; dedupe on `(provider, ext_order_id)`.
- Outbound accept/reject/food-ready/stock/store-status as pg-boss jobs with exponential backoff, dead letter and an owner-visible failure banner.
- POS: loud alert + countdown to the accept deadline; rider status/ETA.
- Per-outlet enable toggle.
- Integration tests with recorded webhook fixtures: duplicate webhook → one order; failed outbound retried.
