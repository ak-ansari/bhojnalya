import { describe, expect, it } from 'vitest';

import { formatINR } from './formatINR';

describe('formatINR', () => {
  it('shows paise as rupees with two decimals', () => {
    expect(formatINR(10500n)).toBe('₹105.00');
    expect(formatINR(1n)).toBe('₹0.01');
    expect(formatINR(0n)).toBe('₹0.00');
  });

  it('groups rupees the Indian way, in lakhs and crores', () => {
    expect(formatINR(12345678n)).toBe('₹1,23,456.78');
    expect(formatINR(1234567890n)).toBe('₹1,23,45,678.90');
  });

  it('puts the minus sign before the rupee symbol', () => {
    expect(formatINR(-50n)).toBe('-₹0.50');
    expect(formatINR(-12345678n)).toBe('-₹1,23,456.78');
  });

  it('keeps every paisa of an amount too large for a float', () => {
    // 2^53 + 7 paise: as a float this rounds up to 2^53 + 8, a whole rupee more.
    expect(formatINR(9007199254740999n)).toBe('₹9,00,71,99,25,47,409.99');
  });
});
