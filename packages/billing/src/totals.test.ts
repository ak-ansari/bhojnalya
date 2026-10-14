import { describe, expect, it } from 'vitest';

import type { InvoiceInput, LineInput } from './totals.js';
import { computeInvoice } from './totals.js';

describe('computeInvoice', () => {
  it('keeps an inclusive line at its menu price when the discount leaves it untouched, and taxes a discounted one on what is left', () => {
    // One paisa of discount over two equal lines: the tie goes to the first.
    // First line: 104.76 − 0.01 = 104.75 × 5% = 5.2375 → 5.24.
    // Second line: untouched, so it still costs exactly 110.00.
    const totals = computeInvoice(
      invoice({
        priceMode: 'inclusive',
        lines: [line(11000n), line(11000n)],
        discount: { kind: 'flat', amount: 1n },
      }),
    );
    expect(
      totals.lines.map((l) => [l.taxableBeforeDiscount, l.discount, l.taxable, l.tax, l.total]),
    ).toEqual([
      [10476n, 1n, 10475n, 524n, 10999n],
      [10476n, 0n, 10476n, 524n, 11000n],
    ]);
  });

  it('applies a per-item rate and lists the tax summary by rate, ascending', () => {
    const totals = computeInvoice(
      invoice({ lines: [line(1000n, 1800), line(1000n, 500), line(1000n, 0), line(1000n, 500)] }),
    );
    expect(totals.taxSummary.map((row) => [row.taxRateBp, row.taxable, row.tax])).toEqual([
      [0, 1000n, 0n],
      [500, 2000n, 100n],
      [1800, 1000n, 180n],
    ]);
  });

  it('multiplies modifiers by quantity along with the unit price', () => {
    const totals = computeInvoice(
      invoice({
        lines: [{ ...line(15000n), modifiers: [{ price: 3000n }, { price: -1000n }], quantity: 3 }],
      }),
    );
    expect(totals.lines[0]?.gross).toBe(51000n);
  });

  it('charges a service charge on the discounted item value, taxed at the outlet rate in its own summary row', () => {
    const totals = computeInvoice(
      invoice({
        outletTaxRateBp: 500,
        lines: [line(10000n, 1800)],
        discount: { kind: 'flat', amount: 2000n },
        serviceCharge: { rateBp: 1000, taxed: true },
      }),
    );
    expect(totals.serviceCharge).toEqual({
      rateBp: 1000,
      base: 8000n,
      amount: 800n,
      taxRateBp: 500,
      tax: 40n,
      cgst: 20n,
      sgst: 20n,
    });
    expect(totals.taxSummary.map((row) => [row.taxRateBp, row.taxable, row.tax])).toEqual([
      [500, 800n, 40n],
      [1800, 8000n, 1440n],
    ]);
  });

  it('leaves an untaxed service charge out of the tax summary', () => {
    const totals = computeInvoice(invoice({ serviceCharge: { rateBp: 1000, taxed: false } }));
    expect(totals.serviceCharge?.taxRateBp).toBeNull();
    expect(totals.taxSummary.map((row) => [row.taxRateBp, row.taxable])).toEqual([[500, 1000n]]);
  });

  it.each([
    ['no lines', invoice({ lines: [] })],
    ['a zero quantity', invoice({ lines: [{ ...line(100n), quantity: 0 }] })],
    ['a fractional quantity', invoice({ lines: [{ ...line(100n), quantity: 1.5 }] })],
    [
      'a negative price after modifiers',
      invoice({ lines: [{ ...line(100n), modifiers: [{ price: -101n }] }] }),
    ],
    ['a negative tax rate', invoice({ lines: [line(100n, -1)] })],
    ['a tax rate above 100%', invoice({ lines: [line(100n, 10001)] })],
    ['a fractional tax rate', invoice({ lines: [line(100n, 500.5)] })],
    ['an outlet tax rate above 100%', invoice({ outletTaxRateBp: 10001 })],
    ['a flat discount above the subtotal', invoice({ discount: { kind: 'flat', amount: 1001n } })],
    ['a negative flat discount', invoice({ discount: { kind: 'flat', amount: -1n } })],
    ['a discount above 100%', invoice({ discount: { kind: 'percent', rateBp: 10001 } })],
    ['a negative discount percent', invoice({ discount: { kind: 'percent', rateBp: -1 } })],
    ['a negative service charge', invoice({ serviceCharge: { rateBp: -1, taxed: false } })],
    ['a service charge above 100%', invoice({ serviceCharge: { rateBp: 10001, taxed: false } })],
  ])('refuses %s rather than guessing', (_what, input) => {
    expect(() => computeInvoice(input)).toThrow(RangeError);
  });
});

function invoice(overrides: Partial<InvoiceInput>): InvoiceInput {
  return {
    taxMode: 'regular',
    priceMode: 'exclusive',
    outletTaxRateBp: 500,
    lines: [line(1000n)],
    discount: null,
    serviceCharge: null,
    ...overrides,
  };
}

function line(unitPrice: bigint, taxRateBp = 500): LineInput {
  return { unitPrice, modifiers: [], quantity: 1, taxRateBp };
}
