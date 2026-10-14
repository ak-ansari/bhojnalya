# Billing test cases

What the billing and GST engine promises, stated as Given / When / Then, with
the tests that check it. Cited as `billing NNNN`. Numbers are stable and never
reused. How to read a case, and what Proposed / Accepted / Superseded and
**GAP** mean: [the platform catalogue](../../../../docs/test-cases/index.md).

Write one with the `test-case` skill.

## Invoice numbering and Indian dates

- [0101 An invoice number is 16 characters and reads back to its parts](./0101-an-invoice-number-is-16-characters-and-reads-back-to-its-parts.md)
- [0102 An invoice belongs to the financial year of its Indian time](./0102-an-invoice-belongs-to-the-financial-year-of-its-indian-time.md)
- [0103 A sale before the day-end cutoff counts towards the previous day](./0103-a-sale-before-the-day-end-cutoff-counts-towards-the-previous-day.md)
- [0104 A device whose clock is behind its last invoice cannot bill](./0104-a-device-whose-clock-is-behind-its-last-invoice-cannot-bill.md)
