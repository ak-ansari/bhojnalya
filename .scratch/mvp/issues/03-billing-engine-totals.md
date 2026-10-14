# 03 Billing engine: line tax, discount, service charge, round-off

Status: resolved
Type: task
Blocked by: 01
Workspaces: packages/billing

## What

The pure GST engine, TRD §6.1 rules 1–9. Load the `billing-engine` skill first. It's the authority on this package.

## Acceptance

- `computeInvoice(input) → InvoiceTotals`: pure, deterministic, no I/O, no `Date.now()`, no floats.
- Inclusive and exclusive pricing; per-line tax; tax summary grouped by rate; CGST = `round_half_up(tax/2)`, SGST = tax − CGST.
- Order discount (flat or %) applied before tax, split pro-rata by largest remainder.
- Service charge: optional, own line, GST on it configurable.
- Round-off to the nearest rupee on its own line (|r| ≤ 50 paise).
- Composition/unregistered: no tax lines, `documentTitle = "Bill of Supply"`, declaration flag.
- **Quality bar:** 100% branch coverage enforced by Vitest thresholds; fast-check properties (totals reconcile, CGST+SGST=tax, discounts sum exactly, no negative lines, determinism; integer-paise generators only); hand-written golden files covering inclusive/exclusive × discount × service × composition.
- Test cases in `packages/billing/docs/test-cases/`.

## Notes

TRD §22 Q4 (GST on service charge) is open, so it stays an input flag.

## Comments

- **contracts (ticket 02 / server re-validation):** a taxed service charge is
  charged at the outlet's default GST rate (TRD §6.1 rule 6), which the engine
  takes as `outletTaxRateBp`. The `invoice.create` payload carries
  `serviceCharge: { rateBp, taxed }` but not that rate, so the server cannot
  re-run such a bill exactly if the outlet's rate changes before sync. Suggest
  adding `outletTaxRateBp` (or `serviceCharge.taxRateBp`) to the payload as a
  snapshot, like the line rates.
- **contracts:** the payload's `totals` has `taxableValue`, `cgst`, `sgst`,
  `discount`, `serviceCharge`, `roundOff`, `grandTotal`. The engine returns all
  of them under the same names (`serviceCharge.amount` for the charge) plus the
  per-line, summary and `tax` figures. Golden 09 is the push fixture's invoice
  and agrees with it exactly.

## Answer

Done. `computeInvoice(input) → InvoiceTotals` in `packages/billing/src/totals.ts`,
with `roundHalfUp` and `allocateLargestRemainder` in `src/money.ts`, exported
from `src/index.ts` beside ticket 04's numbering. Pure: no I/O, no clock, no
floats. Amounts are `bigint` paise; rates are whole basis points (`taxRateBp`,
`rateBp`) and quantities whole units, as `number`s, matching the sync
contract so a synced invoice's lines and discount pass straight in. A
fractional rate or quantity is refused (`BigInt` throws), never rounded.

What it does (TRD §6.1 rules 1–9): exclusive and inclusive pricing; tax per
line, summary grouped by rate ascending; CGST = round_half_up(tax/2), SGST =
the rest, per line; flat or % order discount on taxable value, split by
largest remainder; optional service charge on its own line; round-off to the
rupee on its own line (−49..+50 paise); composition/unregistered gives "Bill
of Supply" with no tax anywhere, and `compositionDeclaration` only for
composition. Impossible input throws `RangeError`.

Decisions (ADR 0017, Proposed, needs the team's yes):

- A discount always comes off taxable value, even on inclusive prices (so ₹10
  off at 5% inclusive takes ₹10.50 off the total). A % discount is rounded
  once on the subtotal.
- An inclusive line the discount does not touch keeps its exact menu price
  (tax = gross − taxable); a line with any share is taxed at its rate on its
  reduced taxable value. Ties in the remainder split go to the earlier line.
- Service charge is a % of the discounted taxable value; when `taxed` it is
  charged at the outlet's default rate and appears in the summary at that
  rate. Never taxed without registration.

Tests (141 in the package, 59 of them mine): 9 hand-written golden files in
`src/golden/` (inclusive/exclusive × discount × service × composition, plus
paise boundaries, a 100% discount and the contracts push fixture), 8
fast-check properties at 2000 runs each, integer generators only (reconcile,
CGST+SGST=tax, discounts sum exactly, no negatives, round-off range and whole
rupee, inclusive menu price kept, Bill of Supply untaxed, determinism), and
unit tests. Coverage 100% statements/branches/functions/lines, enforced by
ticket 04's thresholds (one shared setup). Seen red: truncating rounding,
dropping the remainder step, SGST = CGST, recomputing inclusive tax, dropping
round-off, taxing composition, and service charge on the pre-discount value.
Each turned golden and property (or unit) tests red; all restored.

Test cases: billing 0001–0006 in `packages/billing/docs/test-cases/`, listed in
its index under "Invoice totals".

`pnpm check --force`: `Tasks: 32 successful, 32 total`.

Proposed `docs/log.md` entry:

- 2026-10-14 · billing · Ticket 03: invoice totals engine (`computeInvoice`), golden files and properties; cases billing 0001–0006; ADR 0017 (discount off taxable value, service charge on the discounted value).
