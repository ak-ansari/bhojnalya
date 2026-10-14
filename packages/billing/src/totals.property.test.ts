// Properties every invoice keeps, over generated bills (TRD §6.2). Generators
// yield integer paise and integer basis points only: a generator that can
// produce 0.1 is testing a different engine.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { DiscountInput, InvoiceInput, LineInput, ServiceChargeInput } from './totals.js';
import { computeInvoice } from './totals.js';

const RUNS = { numRuns: 2000 };

// 2,000 runs per property take ~1 s idle but far longer on a loaded CI runner;
// the default 5 s timeout made them flaky without any property failing.
describe('computeInvoice properties', { timeout: 60_000 }, () => {
  it('reconciles: subtotal − discount + service charge + tax + round-off = grand total', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        expect(t.subtotal - t.discount + (t.serviceCharge?.amount ?? 0n) + t.tax + t.roundOff).toBe(
          t.grandTotal,
        );
        expect(sum(t.lines.map((l) => l.taxableBeforeDiscount))).toBe(t.subtotal);
        expect(sum(t.lines.map((l) => l.taxable))).toBe(t.taxableValue);
        expect(t.subtotal - t.discount).toBe(t.taxableValue);
        for (const l of t.lines) expect(l.taxableBeforeDiscount - l.discount + l.tax).toBe(l.total);
      }),
      RUNS,
    );
  });

  it('splits every line and the service charge into CGST + SGST = tax, at most a paisa apart', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        const taxed = [...t.lines, ...(t.serviceCharge ? [t.serviceCharge] : [])];
        for (const part of taxed) {
          expect(part.cgst + part.sgst).toBe(part.tax);
          expect(part.cgst - part.sgst === 0n || part.cgst - part.sgst === 1n).toBe(true);
        }
        expect(t.cgst + t.sgst).toBe(t.tax);
        expect(sum(taxed.map((p) => p.tax))).toBe(t.tax);
        expect(sum(t.taxSummary.map((r) => r.tax))).toBe(t.tax);
        expect(sum(t.taxSummary.map((r) => r.cgst))).toBe(t.cgst);
      }),
      RUNS,
    );
  });

  it('splits the order discount so line discounts sum exactly to it', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        expect(sum(t.lines.map((l) => l.discount))).toBe(t.discount);
      }),
      RUNS,
    );
  });

  it('never produces a negative amount on any line', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        for (const l of t.lines) {
          for (const amount of [
            l.gross,
            l.taxableBeforeDiscount,
            l.discount,
            l.taxable,
            l.tax,
            l.cgst,
            l.sgst,
            l.total,
          ]) {
            expect(amount >= 0n).toBe(true);
          }
        }
        for (const amount of [
          t.subtotal,
          t.discount,
          t.serviceCharge?.amount ?? 0n,
          t.serviceCharge?.tax ?? 0n,
          t.grandTotal,
        ]) {
          expect(amount >= 0n).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it('rounds to a whole rupee with a round-off of −49 to +50 paise', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        expect(t.grandTotal % 100n).toBe(0n);
        expect(t.roundOff >= -49n && t.roundOff <= 50n).toBe(true);
      }),
      RUNS,
    );
  });

  it('charges an undiscounted inclusive line exactly its menu price', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        if (input.priceMode !== 'inclusive') return;
        for (const l of t.lines) if (l.discount === 0n) expect(l.total).toBe(l.gross);
      }),
      RUNS,
    );
  });

  it('charges no tax at all on a Bill of Supply', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        if (input.taxMode === 'regular') return;
        expect(t.documentTitle).toBe('Bill of Supply');
        expect(t.tax).toBe(0n);
        expect(t.taxSummary).toEqual([]);
        for (const l of t.lines) expect(l.total).toBe(l.taxable);
      }),
      RUNS,
    );
  });

  it('gives the same output for the same input, every time', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        expect(computeInvoice(structuredClone(input))).toEqual(computeInvoice(input));
      }),
      RUNS,
    );
  });
});

const paise = (max: bigint) => fc.bigInt({ min: 0n, max });
// Real GST rates plus arbitrary whole basis points, so nothing depends on a "nice" rate.
const rateBp = fc.oneof(
  fc.constantFrom(0, 25, 300, 500, 1200, 1800, 2800, 4000),
  fc.integer({ min: 0, max: 10_000 }),
);

const aLine: fc.Arbitrary<LineInput> = fc
  .record({
    unitPrice: paise(500_000n),
    modifiers: fc.array(fc.record({ price: fc.bigInt({ min: -5_000n, max: 20_000n }) }), {
      maxLength: 3,
    }),
    quantity: fc.integer({ min: 1, max: 50 }),
    taxRateBp: rateBp,
  })
  .filter((line) => line.unitPrice + line.modifiers.reduce((a, m) => a + m.price, 0n) >= 0n);

const aDiscount = (seed: bigint): fc.Arbitrary<DiscountInput | null> =>
  fc.oneof(
    fc.constant(null),
    fc.integer({ min: 0, max: 10_000 }).map((rateBp) => ({ kind: 'percent' as const, rateBp })),
    // A flat discount is some fraction of what the bill could hold; clamped below.
    fc.constant({ kind: 'flat' as const, amount: seed }),
  );

const aServiceCharge: fc.Arbitrary<ServiceChargeInput | null> = fc.oneof(
  fc.constant(null),
  fc.record({ rateBp: fc.integer({ min: 0, max: 2_000 }), taxed: fc.boolean() }),
);

const anInvoice: fc.Arbitrary<InvoiceInput> = fc
  .record({
    taxMode: fc.constantFrom(
      'regular' as const,
      'regular' as const,
      'composition' as const,
      'unregistered' as const,
    ),
    priceMode: fc.constantFrom('exclusive' as const, 'inclusive' as const),
    outletTaxRateBp: rateBp,
    lines: fc.array(aLine, { minLength: 1, maxLength: 12 }),
    flatSeed: paise(10n ** 9n),
    serviceCharge: aServiceCharge,
  })
  .chain(({ flatSeed, ...rest }) => aDiscount(flatSeed).map((discount) => ({ ...rest, discount })))
  .map((input) => clampFlatDiscount(input));

/** A flat discount can be at most the subtotal; find it and keep the discount under it. */
function clampFlatDiscount(input: InvoiceInput): InvoiceInput {
  if (input.discount?.kind !== 'flat') return input;
  const subtotal = computeInvoice({ ...input, discount: null }).subtotal;
  return { ...input, discount: { kind: 'flat', amount: input.discount.amount % (subtotal + 1n) } };
}

function sum(amounts: readonly bigint[]): bigint {
  return amounts.reduce((acc, amount) => acc + amount, 0n);
}
