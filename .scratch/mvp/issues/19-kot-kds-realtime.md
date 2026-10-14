# 19 KOT, KDS and Socket.io

Status: ready-for-agent
Type: task
Blocked by: 17, 18
Workspaces: apps/api, apps/app

## What

TRD §9, PRD K1–K5, US-KDS-*. Load `api-code` and `web-code`.

## Acceptance

- Socket.io `/staff` namespace with device/owner JWT; rooms `outlet:{id}`, `outlet:{id}:kds`.
- "Send to kitchen" creates an incremental KOT (only new items), numbered per device per business day.
- KDS screen: tickets New → Preparing → Ready, sort toggle, age colours from outlet thresholds, print KOT. Design: `Kds.dc.html`.
- Events `kot.created`, `kot.updated`, `kot.ready`, `table.status_changed` emitted as notifications; clients refetch.
- Per-outlet setting: KOT to screen, printer or both (US-KDS-07); offline POS auto-prints KOT.
- Story test (`test/stories/`): POS sends KOT → KDS sees it < 2 s → Ready → POS notified.
