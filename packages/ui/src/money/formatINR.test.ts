import { describe, expect, it } from 'vitest';

import { formatINR } from './formatINR.js';

describe('formatINR', () => {
  it('groups rupees in lakhs and crores with the ₹ sign and two paise digits', () => {
    expect(formatINR(12645000n)).toBe('₹1,26,450.00');
    expect(formatINR(1234567890n)).toBe('₹1,23,45,678.90');
  });

  it('shows the paise of an amount below one rupee, padded to two digits', () => {
    expect(formatINR(0n)).toBe('₹0.00');
    expect(formatINR(5n)).toBe('₹0.05');
    expect(formatINR(50n)).toBe('₹0.50');
    expect(formatINR(55100n)).toBe('₹551.00');
  });

  it('puts the minus sign before the ₹ for a negative amount such as a round-off', () => {
    expect(formatINR(-50n)).toBe('-₹0.50');
    expect(formatINR(-12345n)).toBe('-₹123.45');
  });

  it('stays exact beyond the largest integer a float holds', () => {
    // 2^53 + 1 paise: a float would round the last digit away.
    expect(formatINR(9007199254740993n)).toBe('₹9,00,71,99,25,47,409.93');
  });
});
