# 03 Billing engine: line tax, discount, service charge, round-off

Status: ready-for-agent
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
