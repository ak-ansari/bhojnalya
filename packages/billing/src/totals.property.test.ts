// Properties every invoice keeps, over generated bills (TRD §6.2). Generators
// yield integer paise and integer basis points only: a generator that can
// produce 0.1 is testing a different engine.
import fc from 'fast-check';
import { describe, expect, inject, it } from 'vitest';

import type { DiscountInput, InvoiceInput, LineInput, ServiceChargeInput } from './totals.js';
import { computeInvoice } from './totals.js';

// Runs per property: 500 by default (FC_NUM_RUNS raises it, e.g. nightly; see
// vitest.config.ts). Each property also stops generating after 20 s and passes
// on what it ran, so a loaded CI runner cannot fail the gate by being slow; a
// real counterexample still fails, and its message carries the seed and path
// to replay it: fc.assert(prop, { seed, path }).
const RUNS = {
  numRuns: inject('fcNumRuns'),
  interruptAfterTimeLimit: 20_000,
  markInterruptAsFailure: false,
  verbose: fc.VerbosityLevel.Verbose,
};

declare module 'vitest' {
  export interface ProvidedContext {
    fcNumRuns: number;
  }
}

// The vitest timeout sits well above the 20 s interrupt, so a slow run ends as
// an interrupted pass and only a counterexample (with its seed) fails.
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

  it('gives identical totals, and each line the same result, whatever order the lines come in', () => {
    fc.assert(
      fc.property(aPermutedInvoice, ({ input, permuted, tagged }) => {
        const a = computeInvoice(input);
        const b = computeInvoice(permuted);
        expect({ ...b, lines: [] }).toEqual({ ...a, lines: [] });
        // Tagged lines are matched by id; untagged ones can only be compared as a whole.
        const byLine = (inv: InvoiceInput, t: typeof a) =>
          inv.lines
            .map((l, i) => JSON.stringify([tagged ? l.orderItemId : '', t.lines[i]], bigints))
            .sort();
        expect(byLine(permuted, b)).toEqual(byLine(input, a));
      }),
      RUNS,
    );
  });

  it('never takes more than the subtotal off, and says so exactly when it caps a flat discount', () => {
    fc.assert(
      fc.property(anInvoice, (input) => {
        const t = computeInvoice(input);
        expect(t.discount <= t.subtotal).toBe(true);
        const asked = input.discount?.kind === 'flat' ? input.discount.amount : 0n;
        expect(t.discountCapped).toBe(asked > t.subtotal);
        if (t.discountCapped) expect(t.discount).toBe(t.subtotal);
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

/**
 * Keeps a flat discount within twice the subtotal: up to the subtotal it is
 * taken in full, above it it is capped, and both happen often enough to test.
 */
function clampFlatDiscount(input: InvoiceInput): InvoiceInput {
  if (input.discount?.kind !== 'flat') return input;
  const subtotal = computeInvoice({ ...input, discount: null }).subtotal;
  return {
    ...input,
    discount: { kind: 'flat', amount: input.discount.amount % (2n * subtotal + 2n) },
  };
}

/**
 * Bills prone to remainder ties: a few small prices repeated across a few
 * rates, and a discount of a few paise, so the leftover paisa often has two
 * equal claimants. Plus any bill at all.
 */
const aTieProneInvoice: fc.Arbitrary<InvoiceInput> = fc.record({
  taxMode: fc.constant('regular' as const),
  priceMode: fc.constantFrom('exclusive' as const, 'inclusive' as const),
  outletTaxRateBp: fc.constant(500),
  lines: fc.array(
    fc.record({
      unitPrice: fc.constantFrom(25n, 830n, 1001n, 11000n),
      modifiers: fc.constant([]),
      quantity: fc.integer({ min: 1, max: 3 }),
      taxRateBp: fc.constantFrom(0, 500, 1800, 2800),
    }),
    { minLength: 2, maxLength: 5 },
  ),
  discount: fc.bigInt({ min: 1n, max: 9n }).map((amount) => ({ kind: 'flat' as const, amount })),
  serviceCharge: fc.constant(null),
});

/** A bill, the same bill with its lines shuffled, and whether its lines carry ids. */
const aPermutedInvoice = fc
  .tuple(fc.oneof(aTieProneInvoice, anInvoice), fc.boolean())
  .chain(([input, tagged]) => {
    const lines = input.lines.map((l, i) =>
      tagged ? { ...l, orderItemId: `item-${String(i).padStart(3, '0')}` } : l,
    );
    return fc
      .shuffledSubarray(lines, { minLength: lines.length, maxLength: lines.length })
      .map((shuffled) => ({
        input: { ...input, lines },
        permuted: { ...input, lines: shuffled },
        tagged,
      }));
  });

function bigints(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? String(value) : value;
}

function sum(amounts: readonly bigint[]): bigint {
  return amounts.reduce((acc, amount) => acc + amount, 0n);
}
