import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { allocateLargestRemainder, roundHalfUp } from './money.js';

describe('roundHalfUp', () => {
  it.each([
    [0n, 2n, 0n],
    [1n, 2n, 1n],
    [3n, 2n, 2n],
    [5n, 2n, 3n],
    [149n, 100n, 1n],
    [150n, 100n, 2n],
    [151n, 100n, 2n],
    [4n, 3n, 1n],
    [5n, 3n, 2n],
  ])('rounds %i / %i to %i, halves up', (numerator, denominator, expected) => {
    expect(roundHalfUp(numerator, denominator)).toBe(expected);
  });

  it.each([
    [-1n, 2n],
    [1n, 0n],
    [1n, -2n],
  ])('refuses %i / %i, which the engine never divides', (numerator, denominator) => {
    expect(() => roundHalfUp(numerator, denominator)).toThrow(RangeError);
  });

  it('is never more than half a unit from the exact quotient', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        (n, d) => {
          const rounded = roundHalfUp(n, d);
          const error = 2n * (rounded * d - n);
          expect(error > -d && error <= d).toBe(true);
        },
      ),
    );
  });
});

describe('allocateLargestRemainder', () => {
  it('rounds every share down, then gives the leftover paise to the largest remainders', () => {
    // 2500 over 9000 / 14900 / 4500: floors 792 / 1311 / 396, one paisa left,
    // remainders 7200 / 17600 / 3600 → the middle share gets it.
    expect(allocateLargestRemainder(2500n, [9000n, 14900n, 4500n])).toEqual([792n, 1312n, 396n]);
  });

  it('breaks a tie in remainders in favour of the earlier weight', () => {
    expect(allocateLargestRemainder(1n, [100n, 100n, 100n])).toEqual([1n, 0n, 0n]);
    expect(allocateLargestRemainder(2n, [100n, 100n, 100n])).toEqual([1n, 1n, 0n]);
  });

  it('orders a tie in remainders by the tie-break it is given, not by position', () => {
    const lastFirst = (a: number, b: number) => b - a;
    expect(allocateLargestRemainder(1n, [100n, 100n, 100n], lastFirst)).toEqual([0n, 0n, 1n]);
    // Unequal remainders still go largest first, whatever the tie-break says.
    expect(allocateLargestRemainder(2500n, [9000n, 14900n, 4500n], lastFirst)).toEqual([
      792n,
      1312n,
      396n,
    ]);
  });

  it('gives nothing to a zero weight, and allocates zero over zero weights', () => {
    expect(allocateLargestRemainder(10n, [0n, 30n, 0n])).toEqual([0n, 10n, 0n]);
    expect(allocateLargestRemainder(0n, [0n, 0n])).toEqual([0n, 0n]);
  });

  it.each([
    ['a negative total', -1n, [10n]],
    ['more than the weights hold', 11n, [10n]],
    ['a positive total over zero weights', 1n, [0n]],
    ['a negative weight', 0n, [10n, -1n]],
  ])('refuses %s', (_what, total, weights) => {
    expect(() => allocateLargestRemainder(total, weights)).toThrow(RangeError);
  });

  it('sums exactly to the total, never exceeds a weight, and stays within a paisa of pro rata', () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: 0n, max: 10n ** 9n }), { minLength: 1, maxLength: 30 }),
        fc.bigInt({ min: 0n, max: 10n ** 6n }),
        (weights, seed) => {
          const sum = weights.reduce((a, b) => a + b, 0n);
          const total = sum === 0n ? 0n : seed % (sum + 1n);
          const shares = allocateLargestRemainder(total, weights);
          expect(shares.reduce((a, b) => a + b, 0n)).toBe(total);
          shares.forEach((share, index) => {
            const weight = weights[index] ?? 0n;
            expect(share >= 0n && share <= weight).toBe(true);
            if (sum > 0n) {
              const exactTimesSum = total * weight;
              expect(share * sum >= exactTimesSum - sum && share * sum <= exactTimesSum + sum).toBe(
                true,
              );
            }
          });
        },
      ),
    );
  });
});
