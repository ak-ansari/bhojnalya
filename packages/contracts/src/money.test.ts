import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Paise, PaiseWire, paise } from './money.js';

describe('PaiseWire', () => {
  it('decodes a digit string to the exact bigint of paise', () => {
    expect(PaiseWire.parse('20000')).toBe(20000n);
    expect(PaiseWire.parse('0')).toBe(0n);
    expect(PaiseWire.parse('-50')).toBe(-50n);
  });

  it('decodes amounts beyond the float-safe range without losing a paisa', () => {
    expect(PaiseWire.parse('9007199254740993')).toBe(9007199254740993n);
  });

  it('encodes paise back to the digit string', () => {
    expect(z.encode(PaiseWire, paise(20000))).toBe('20000');
    expect(z.encode(PaiseWire, paise(-50))).toBe('-50');
  });

  it.each<[unknown, string]>([
    [20000, 'a JSON number'],
    ['200.00', 'rupees with a decimal point'],
    ['020000', 'a leading zero'],
    ['+20000', 'a plus sign'],
    ['-0', 'negative zero'],
    ['2e4', 'an exponent'],
    [' 20000', 'whitespace'],
    ['', 'an empty string'],
  ])('refuses %j (%s)', (input) => {
    expect(PaiseWire.safeParse(input).success).toBe(false);
  });

  it('round-trips every bigint through its wire string', () => {
    fc.assert(
      fc.property(fc.bigInt(), (amount) => {
        const wire = z.encode(PaiseWire, paise(amount));
        expect(wire).toMatch(/^(0|-?[1-9]\d*)$/);
        expect(PaiseWire.parse(wire)).toBe(amount);
      }),
    );
  });
});

describe('Paise', () => {
  it('holds a bigint and refuses a number', () => {
    expect(Paise.parse(10500n)).toBe(10500n);
    expect(Paise.safeParse(10500).success).toBe(false);
  });
});

describe('paise', () => {
  it('builds paise from a safe integer or a bigint', () => {
    expect(paise(10500)).toBe(10500n);
    expect(paise(10500n)).toBe(10500n);
  });

  it('refuses a fraction of a paisa and an unsafe number', () => {
    expect(() => paise(105.5)).toThrow(RangeError);
    expect(() => paise(2 ** 53)).toThrow(RangeError);
  });
});
