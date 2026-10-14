// Money in contracts (invariant 1, TRD §2 D12). In memory an amount is a
// branded bigint of paise; on the wire it is a canonical string of digits
// (ADR 0018), decoded and encoded by the one codec below.
import { z } from 'zod';

/** An amount of money in paise, in memory. Signed: a round-off can be negative. */
export const Paise = z.bigint().brand<'Paise'>();
export type Paise = z.infer<typeof Paise>;

/**
 * Paise as they cross a JSON boundary: `"20000"` ⇄ `20000n`.
 * `parse`/`z.decode` turn the wire string into Paise; `z.encode` turns Paise
 * back into the string. Only the canonical form is accepted, so one amount has
 * exactly one spelling and documents compare equal.
 */
export const PaiseWire = z.codec(
  z.string().regex(/^(0|-?[1-9]\d*)$/, 'paise must be a canonical integer string, e.g. "20000"'),
  Paise,
  {
    decode: (digits) => Paise.parse(BigInt(digits)),
    encode: (amount) => amount.toString(),
  },
);

/** Builds Paise from a literal; a number must be a safe integer, never a fraction of a paisa. */
export function paise(amount: bigint | number): Paise {
  if (typeof amount === 'number' && !Number.isSafeInteger(amount)) {
    throw new RangeError(`paise must be a safe integer, got ${String(amount)}`);
  }
  return Paise.parse(BigInt(amount));
}
