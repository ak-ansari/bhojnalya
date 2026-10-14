# 04 Invoice numbering, financial year and clock guard

Status: resolved
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

## Answer

Done. `packages/billing/src/numbering/` exports, through `src/index.ts`:
`financialYear`, `isFinancialYear`, `businessDate`, `formatInvoiceNo`,
`parseInvoiceNo`, `assertClockNotBehind`, the typed errors
`InvalidInvoiceNumberError` (`code: 'INVALID_INVOICE_NUMBER'`, `field` names
the bad part) and `ClockBehindError` (`code: 'CLOCK_BEHIND'`, carries `now`
and `lastInvoiceAt`), plus `INVOICE_NO_MAX_LENGTH`, `INVOICE_SEQ_MAX`,
`IST_OFFSET_MINUTES`. Instants are `Date` arguments; nothing reads the clock.

Tests: 82 unit tests incl. fast-check properties (format/parse round-trip both
ways, length ≤ 16, GST character set, FY and business date cross-checked
against `Intl` `Asia/Kolkata` at random instants 2000–2099, clock guard throws
iff `now < last`). Coverage 100% statements/branches/functions/lines,
enforced by thresholds in `vitest.config.ts`; `test` now runs
`vitest run --coverage`. 15 deliberate mutations (FY boundary, offset, cutoff
sign, seq bounds, regexes, slice offsets, `<` vs `<=`, null handling) each
seen red, then restored. Cases: `billing 0101`–`0104`.

Decisions:

- IST is a fixed +05:30 offset computed by arithmetic, not the device zone or
  the tz database ([ADR 0016](../../../docs/decisions/0016-indian-time-is-a-fixed-offset-never-the-devices-zone.md), Proposed).
- Day-end cutoff is a whole hour 0–23; a sale before it belongs to the
  previous IST date (ADR 0016).
- Prefix is two of `A-Z0-9` (upper case only, so `bl` and `BL` can't become
  two series; `-` and `/` excluded so the number parses unambiguously). Device
  code is two upper-case base36 chars.
- Every part is fixed-width, so a valid number is always exactly 16 chars; the
  limit is enforced by part validation, not a separate (unreachable) length
  check. FY must be consecutive (`2627`, `9900`); seq 1..999999, so `000000`
  is rejected by `parseInvoiceNo`.
- `assertClockNotBehind` allows the same instant, and takes `null` for a
  device with no invoice yet.
- Added dev deps `fast-check@4.3.0`, `@vitest/coverage-v8@3.2.7` to
  `packages/billing` (root `pnpm-lock.yaml` changes with them); reconcile with
  ticket 03's coverage config at merge.

Proposed `docs/log.md` entry:

- 2026-10-14 — billing: invoice numbering, IST financial year, business date with day-end cutoff and the clock guard (ticket 04); cases billing 0101–0104; ADR 0016 (IST as a fixed offset).
