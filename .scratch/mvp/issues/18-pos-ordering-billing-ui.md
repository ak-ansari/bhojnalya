# 18 POS screens: tables, order, bill, payment, print routes

Status: ready-for-agent
Type: task
Blocked by: 15, 16
Workspaces: apps/app

## What

US-POS-01..15 except KOT-to-KDS. Load `web-code`. Designs: `Main`, `Tables`, `Payment`, `Invoice`, `Device` in `design/ui-board/project/`.

## Acceptance

- Table view with status and running time; dine-in on a table, takeaway on a token.
- Item search + category grid, modifier pop-up, qty, notes; add item < 100 ms with no network in the path.
- Bill: subtotal, CGST/SGST, optional removable service charge, order discount with reason, round-off, grand total, all from the engine.
- Payments: cash/UPI/card/other, split.
- Void item/order with reason; move and merge tables.
- Print routes for bill and KOT with `@page` 80 mm / 58 mm; "Bill of Supply" for composition/unregistered; reprint keeps the same number.
- Component tests for each screen; one Playwright e2e for counter billing against the real API.
