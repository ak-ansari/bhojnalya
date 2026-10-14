// Integer-paise arithmetic for the billing engine (TRD §6.1 rule 1, ADR 0003).
// Every division in the engine goes through one of these two functions, so
// every remainder has one defined destination.

/**
 * `numerator / denominator` rounded to the nearest integer, halves away from
 * zero (₹0.005 → ₹0.01). The only rounding the engine uses (TRD §6.1).
 * Defined for a non-negative numerator and a positive denominator: the engine
 * never divides anything else, so anything else is a bug and throws.
 */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new RangeError(`roundHalfUp(${String(numerator)}, ${String(denominator)}) is undefined`);
  }
  return (2n * numerator + denominator) / (2n * denominator);
}

/**
 * Splits `total` across `weights` in proportion to each weight, by the
 * largest-remainder method (TRD §6.1 rule 5): each share is first rounded
 * down, then the paise left over go one each to the shares with the largest
 * remainders. Ties go to the earlier weight, so the split is deterministic.
 *
 * The shares always sum exactly to `total`, and no share exceeds its weight
 * while `total` does not exceed the sum of the weights.
 */
export function allocateLargestRemainder(total: bigint, weights: readonly bigint[]): bigint[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0n);
  if (total < 0n || total > sum || weights.some((weight) => weight < 0n)) {
    throw new RangeError(`cannot allocate ${String(total)} over weights summing to ${String(sum)}`);
  }
  if (total === 0n) return weights.map(() => 0n);
  const floors = weights.map((weight) => (total * weight) / sum);
  const leftover = total - floors.reduce((acc, share) => acc + share, 0n);
  const topUps = new Set(
    weights
      .map((weight, index) => ({ index, remainder: (total * weight) % sum }))
      .sort(byRemainderThenIndex)
      .slice(0, Number(leftover))
      .map(({ index }) => index),
  );
  return floors.map((share, index) => (topUps.has(index) ? share + 1n : share));
}

function byRemainderThenIndex(
  a: { index: number; remainder: bigint },
  b: { index: number; remainder: bigint },
): number {
  if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
  return a.index - b.index;
}
