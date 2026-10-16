import { describe, expect, it } from 'vitest';

import type { InvoiceInput, LineInput } from './totals.js';
import { computeInvoice } from './totals.js';

describe('computeInvoice', () => {
  it('keeps an inclusive line at its menu price when the discount leaves it untouched, and taxes a discounted one on what is left', () => {
    // One paisa of discount over two identical lines: either may take it, and
    // with nothing to tell them apart it goes to the first.
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

  it('gives the same totals whatever order the lines are in, breaking a remainder tie by the line itself', () => {
    // ₹8.30 at 5% and ₹8.30 at 18%, ₹0.01 off: the remainders tie, and the
    // paisa goes to the higher rate whichever line comes first.
    // 18% line: 8.29 × 18% = 1.4922 → 1.49. 5% line: 8.30 × 5% = 0.415 → 0.42.
    // 16.59 + 1.91 = 18.50 → ₹19.00, round-off +0.50.
    const five = { ...line(830n, 500), orderItemId: 'a' };
    const eighteen = { ...line(830n, 1800), orderItemId: 'b' };
    const discount = { kind: 'flat', amount: 1n } as const;
    const forwards = computeInvoice(invoice({ lines: [five, eighteen], discount }));
    const backwards = computeInvoice(invoice({ lines: [eighteen, five], discount }));
    expect(forwards.lines.map((l) => [l.taxRateBp, l.discount, l.tax])).toEqual([
      [500, 0n, 42n],
      [1800, 1n, 149n],
    ]);
    expect(backwards.lines).toEqual([...forwards.lines].reverse());
    expect({ ...backwards, lines: [] }).toEqual({ ...forwards, lines: [] });
    expect(forwards.grandTotal).toBe(1900n);
  });

  it('breaks a tie between lines of equal rate and taxable value by the larger menu amount', () => {
    // Inclusive at 28%: ₹0.03 and ₹0.02 both hold ₹0.02 of taxable value.
    // ₹0.01 off ties; the ₹0.03 line takes it (taxable ₹0.01, tax ₹0.00), and
    // the ₹0.02 line keeps its menu price: ₹0.03 payable in either order.
    const big = line(3n, 2800);
    const small = line(2n, 2800);
    const discount = { kind: 'flat', amount: 1n } as const;
    for (const [lines, bigAt] of [
      [[big, small], 0],
      [[small, big], 1],
    ] as const) {
      const totals = computeInvoice(invoice({ priceMode: 'inclusive', lines, discount }));
      expect(totals.lines.map((l) => l.taxableBeforeDiscount)).toEqual([2n, 2n]);
      expect(totals.lines[bigAt]?.discount).toBe(1n);
      expect(totals.taxableValue + totals.tax).toBe(3n);
    }
  });

  it('breaks a tie between lines alike in rate and amount by their order item id', () => {
    // Inclusive ₹110.00 twice at 5%, ₹0.01 off: the paisa goes to the lower id.
    const x = { ...line(11000n), orderItemId: '01a1391a-0000-7000-8000-000000000002' };
    const y = { ...line(11000n), orderItemId: '01a1391a-0000-7000-8000-000000000001' };
    const discount = { kind: 'flat', amount: 1n } as const;
    for (const lines of [
      [x, y],
      [y, x],
    ]) {
      const totals = computeInvoice(invoice({ priceMode: 'inclusive', lines, discount }));
      const share = new Map(lines.map((l, i) => [l.orderItemId, totals.lines[i]?.discount]));
      expect([share.get(x.orderItemId), share.get(y.orderItemId)]).toEqual([0n, 1n]);
    }
  });

  it('caps a flat discount at the taxable value and says so, rather than refusing the bill', () => {
    // A ₹105.00 item, 5% included, comped with ₹105.00 off: only ₹100.00 of
    // it is taxable value, so ₹100.00 comes off and the bill is ₹0.00.
    const comp = computeInvoice(
      invoice({
        priceMode: 'inclusive',
        lines: [line(10500n)],
        discount: { kind: 'flat', amount: 10500n },
        serviceCharge: { rateBp: 1000, taxed: true },
      }),
    );
    expect([comp.subtotal, comp.discount, comp.taxableValue, comp.tax]).toEqual([
      10000n,
      10000n,
      0n,
      0n,
    ]);
    expect(comp.serviceCharge?.amount).toBe(0n);
    expect(comp.grandTotal).toBe(0n);
    expect(comp.discountCapped).toBe(true);

    const exact = computeInvoice(invoice({ discount: { kind: 'flat', amount: 1000n } }));
    expect([exact.discount, exact.discountCapped]).toEqual([1000n, false]);
    const none = computeInvoice(invoice({}));
    expect(none.discountCapped).toBe(false);
  });

  it.each([
    ['no lines', invoice({ lines: [] })],
    ['a zero quantity', invoice({ lines: [{ ...line(100n), quantity: 0 }] })],
    ['a fractional quantity', invoice({ lines: [{ ...line(100n), quantity: 1.5 }] })],
    [
      'a quantity beyond the largest safe integer',
      invoice({ lines: [{ ...line(1n), quantity: 2 ** 53 + 2 }] }),
    ],
    [
      'a negative price after modifiers',
      invoice({ lines: [{ ...line(100n), modifiers: [{ price: -101n }] }] }),
    ],
    ['a negative tax rate', invoice({ lines: [line(100n, -1)] })],
    ['a tax rate above 100%', invoice({ lines: [line(100n, 10001)] })],
    ['a fractional tax rate', invoice({ lines: [line(100n, 500.5)] })],
    ['an outlet tax rate above 100%', invoice({ outletTaxRateBp: 10001 })],
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
