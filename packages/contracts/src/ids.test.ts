import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { IDEMPOTENCY_KEY_HEADER, IdempotencyKey, Uuidv7, newId } from './ids.js';

const fixedBytes = (value: number) => (bytes: Uint8Array) => {
  bytes.fill(value);
};

describe('newId', () => {
  it('puts the injected millisecond in the first 48 bits, version 7 and the RFC variant', () => {
    // 2026-10-14T06:30:00.000Z = 1792045800000 ms = 0x01a1391a7e40
    const id = newId({
      now: () => Date.parse('2026-10-14T06:30:00.000Z'),
      fillRandom: fixedBytes(0),
    });
    expect(id).toBe('01a1391a-7e40-7000-8000-000000000000');
  });

  it('keeps the version and variant bits whatever the random bytes are', () => {
    const id = newId({ now: () => 0, fillRandom: fixedBytes(0xff) });
    expect(id).toBe('00000000-0000-7fff-bfff-ffffffffffff');
  });

  it('makes a valid lowercase UUIDv7 for any time in range and any randomness', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 48 - 1 }),
        fc.uint8Array({ minLength: 10, maxLength: 10 }),
        (ms, random) => {
          const id = newId({
            now: () => ms,
            fillRandom: (bytes) => {
              bytes.set(random);
            },
          });
          expect(Uuidv7.safeParse(id).success).toBe(true);
          expect(Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16)).toBe(ms);
        },
      ),
    );
  });

  it('sorts ids made in later milliseconds after earlier ones', () => {
    const earlier = newId({ now: () => 1_000, fillRandom: fixedBytes(0xff) });
    const later = newId({ now: () => 1_001, fillRandom: fixedBytes(0) });
    expect(earlier < later).toBe(true);
  });

  it('refuses a time before 1970 or past the 48-bit range', () => {
    expect(() => newId({ now: () => -1, fillRandom: fixedBytes(0) })).toThrow(RangeError);
    expect(() => newId({ now: () => 2 ** 48, fillRandom: fixedBytes(0) })).toThrow(RangeError);
  });

  it('defaults to the real clock and Web Crypto', () => {
    const a = newId();
    const b = newId();
    expect(Uuidv7.safeParse(a).success).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('Uuidv7', () => {
  it('accepts a lowercase v7', () => {
    expect(Uuidv7.safeParse('01a1391a-7e40-7069-a49b-8d79e28ef2ab').success).toBe(true);
  });

  it.each([
    ['01A1391A-7E40-7069-A49B-8D79E28EF2AB', 'uppercase'],
    ['01a1391a-7e40-4069-a49b-8d79e28ef2ab', 'version 4'],
    ['01a1391a-7e40-7069-c49b-8d79e28ef2ab', 'wrong variant'],
    ['01a1391a7e407069a49b8d79e28ef2ab', 'no hyphens'],
  ])('refuses %s (%s)', (input) => {
    expect(Uuidv7.safeParse(input).success).toBe(false);
  });
});

describe('IdempotencyKey', () => {
  it('is sent in the Idempotency-Key header', () => {
    expect(IDEMPOTENCY_KEY_HEADER).toBe('Idempotency-Key');
  });

  it('accepts a lowercase v7 or v4 UUID and refuses anything else', () => {
    expect(IdempotencyKey.safeParse('01a1391a-7e40-7069-a49b-8d79e28ef2ab').success).toBe(true);
    expect(IdempotencyKey.safeParse('3b241101-e2bb-4255-8caf-4136c566a962').success).toBe(true);
    expect(IdempotencyKey.safeParse('3B241101-E2BB-4255-8CAF-4136C566A962').success).toBe(false);
    expect(IdempotencyKey.safeParse('retry-1').success).toBe(false);
  });
});
