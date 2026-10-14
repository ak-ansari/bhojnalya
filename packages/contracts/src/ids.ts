// Ids and idempotency keys (invariant 8, TRD §2 D11, §14). Every record id is a
// UUIDv7 made on the client; every mutating POS/QR request carries a UUID key.
import { z } from 'zod';

/** A record id: a lowercase UUIDv7, so one id has one spelling on every side. */
export const Uuidv7 = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    'must be a lowercase UUIDv7',
  )
  .brand<'Uuidv7'>();
export type Uuidv7 = z.infer<typeof Uuidv7>;

/** The header every mutating POS/QR request carries (TRD §14). */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** An idempotency key: any lowercase RFC 9562 UUID (a guest browser may send v4). */
export const IdempotencyKey = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    'must be a lowercase UUID',
  )
  .brand<'IdempotencyKey'>();
export type IdempotencyKey = z.infer<typeof IdempotencyKey>;

/** Where newId reads time and randomness; injected in tests, defaulted in apps. */
export interface IdSource {
  /** Milliseconds since the Unix epoch. */
  now: () => number;
  /** Fills the array with cryptographically random bytes. */
  fillRandom: (bytes: Uint8Array) => void;
}

/**
 * A new UUIDv7 (RFC 9562 §5.7): 48 bits of Unix milliseconds, then version 7,
 * then 74 random bits under the RFC variant. Ids made in the same millisecond
 * are not ordered among themselves (ADR 0009: id order is approximate).
 */
export function newId(source: IdSource = defaultIdSource): Uuidv7 {
  const ms = source.now();
  if (!Number.isSafeInteger(ms) || ms < 0 || ms >= 2 ** 48) {
    throw new RangeError(`UUIDv7 timestamp out of range: ${String(ms)}`);
  }
  const bytes = new Uint8Array(16);
  source.fillRandom(bytes.subarray(6));
  writeTimestamp(bytes, ms);
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
  return Uuidv7.parse(formatUuid(bytes));
}

const defaultIdSource: IdSource = {
  now: () => Date.now(),
  fillRandom: (bytes) => {
    crypto.getRandomValues(bytes);
  },
};

// Web Crypto is global in every runtime this ships to (Node 22, the browsers);
// declared here because a library compiles against neither DOM nor Node types.
declare const crypto: { getRandomValues: (bytes: Uint8Array) => Uint8Array };

// Big-endian into bytes 0..5; division, not bit shifts, because 48 bits
// overflow JavaScript's 32-bit shift operators.
function writeTimestamp(bytes: Uint8Array, ms: number): void {
  let rest = ms;
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
