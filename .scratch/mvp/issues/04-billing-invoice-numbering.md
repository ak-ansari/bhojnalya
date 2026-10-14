# 04 Invoice numbering, financial year and clock guard

Status: ready-for-agent
Type: task
Blocked by: 01
Workspaces: packages/billing (new module `src/numbering/`)

## What

The pure parts of invariant 6 / TRD §7, so the POS and the API share them.

## Acceptance

- `financialYear(instant)` → `"2627"`, computed in IST (Asia/Kolkata); the boundary is 1 April 00:00 IST (test 31 Mar 18:29:59Z vs 18:30:00Z).
- `formatInvoiceNo({ prefix, deviceCode, fy, seq })` → `BL0A/2627/000042`; rejects anything over 16 chars, prefix ≠ 2 chars, device code not 2-char base36, seq outside 1..999999.
- `parseInvoiceNo` (the inverse) for the server's gap detection.
- `businessDate(instant, cutoffHour)` in IST (a 4 AM cutoff puts 02:00 IST into the previous day).
- `assertClockNotBehind(now, lastInvoiceAt)`: a typed error when the clock is behind.
- Same quality bar as ticket 03 (100% branch, properties: format/parse round-trip, length ≤ 16).

## Notes

Coordinate with ticket 03 only through `src/index.ts` exports. Keep this in its own folder to avoid merge conflicts.
