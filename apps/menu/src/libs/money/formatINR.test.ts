import { describe, expect, it } from 'vitest';

import { formatINR } from './formatINR.js';

describe('formatINR', () => {
  it('groups whole rupees the Indian way and drops the paise', () => {
    expect(formatINR(15000n)).toBe('₹150');
    expect(formatINR(10000000n)).toBe('₹1,00,000');
  });

  it('shows two decimals when there are paise', () => {
    expect(formatINR(15050n)).toBe('₹150.50');
    expect(formatINR(5n)).toBe('₹0.05');
  });

  it('formats zero and negative amounts', () => {
    expect(formatINR(0n)).toBe('₹0');
    expect(formatINR(-12345n)).toBe('-₹123.45');
  });

  it('keeps every digit of an amount too large for a float', () => {
    expect(formatINR(900719925474099199n)).toBe('₹9,00,71,99,25,47,40,991.99');
  });
});
