# Billing test cases

What the billing and GST engine promises, stated as Given / When / Then, with
the tests that check it. Cited as `billing NNNN`. Numbers are stable and never
reused. How to read a case, and what Proposed / Accepted / Superseded and
**GAP** mean: [the platform catalogue](../../../../docs/test-cases/index.md).

Write one with the `test-case` skill.

## Invoice totals

- [0001 An invoice adds up exactly to a whole-rupee total](./0001-an-invoice-adds-up-exactly-to-a-whole-rupee-total.md)
- [0002 Each line is taxed on its own, and its tax splits exactly into CGST and SGST](./0002-each-line-is-taxed-on-its-own-and-its-tax-splits-exactly-into-cgst-and-sgst.md)
- [0003 An order discount comes off taxable value, and its line shares sum exactly to it](./0003-an-order-discount-comes-off-taxable-value-and-its-line-shares-sum-exactly-to-it.md)
- [0004 A service charge is its own line on the discounted value, taxed only when asked](./0004-a-service-charge-is-its-own-line-on-the-discounted-value-taxed-only-when-asked.md)
- [0005 A composition or unregistered outlet issues a Bill of Supply with no tax](./0005-a-composition-or-unregistered-outlet-issues-a-bill-of-supply-with-no-tax.md)
- [0006 A bill no outlet could issue is refused, never clamped](./0006-a-bill-no-outlet-could-issue-is-refused-never-clamped.md) (Superseded by 0007, 0008)
- [0007 A bill no outlet could issue is refused](./0007-a-bill-no-outlet-could-issue-is-refused.md)
- [0008 A flat discount larger than the bill is capped at its taxable value, and the bill says so](./0008-a-flat-discount-larger-than-the-bill-is-capped-at-its-taxable-value-and-the-bill-says-so.md)
- [0009 A bill adds up the same whatever order its lines are in](./0009-a-bill-adds-up-the-same-whatever-order-its-lines-are-in.md)

## Invoice numbering and Indian dates

- [0101 An invoice number is 16 characters and reads back to its parts](./0101-an-invoice-number-is-16-characters-and-reads-back-to-its-parts.md)
- [0102 An invoice belongs to the financial year of its Indian time](./0102-an-invoice-belongs-to-the-financial-year-of-its-indian-time.md)
- [0103 A sale before the day-end cutoff counts towards the previous day](./0103-a-sale-before-the-day-end-cutoff-counts-towards-the-previous-day.md)
- [0104 A device whose clock is behind its last invoice cannot bill](./0104-a-device-whose-clock-is-behind-its-last-invoice-cannot-bill.md)
