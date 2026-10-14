# 20 QR table ordering end to end

Status: ready-for-agent
Type: task
Blocked by: 11, 14, 15, 19
Workspaces: apps/api, apps/menu, apps/app

## What

TRD §10, PRD Q1–Q9, US-QR-*. Designs: `QrMenu`, `QrCart`, `QrStatus`, `Incoming`.

## Acceptance

- First scan opens/joins a `table_session` and issues a signed guest token; settling closes it; the next party gets a fresh session.
- Guest places order → `pending` → `order.qr_pending` to POS with sound + badge → accept (sends KOT) / reject; outlet auto-accept flag.
- `/guest` namespace, room `session:{id}`; live status Placed → Accepted → Preparing → Ready; "View bill" shows running total.
- Out-of-stock reflects live; ordering paused banner when the outlet's POS is offline.
- Anti-abuse: rate limits (5 orders/10 min/session, 30 req/min/IP), max items/qty, honeypot.
- Optional name/phone with a DPDP notice.
- Bundle stays < 120 KB gz.
- Story test: guest orders → cashier accepts → KDS ready → guest sees Ready.
