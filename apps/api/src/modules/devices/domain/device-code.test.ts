import { describe, expect, it } from 'vitest';

import { DEVICE_CODES_PER_OUTLET, nextDeviceCode } from './device-code.js';

describe('nextDeviceCode', () => {
  it('starts an outlet at 01', () => {
    expect(nextDeviceCode([])).toBe('01');
  });

  it('counts in base36 with upper-case letters: 09 then 0A, 0Z then 10', () => {
    expect(nextDeviceCode(['01', '02', '03', '04', '05', '06', '07', '08', '09'])).toBe('0A');
    const upTo0Z = Array.from(
      { length: 35 },
      (_, i) => `0${'123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(i)}`,
    );
    expect(nextDeviceCode(upTo0Z)).toBe('10');
  });

  it('never hands out a taken code, even one whose device was retired', () => {
    expect(nextDeviceCode(['01', '03'])).toBe('02');
    expect(nextDeviceCode(['02', '01'])).toBe('03');
  });

  it('gives null when every one of the 1,295 codes is taken, and ZZ is the last', () => {
    const all: string[] = [];
    let code = nextDeviceCode(all);
    while (code !== null) {
      all.push(code);
      code = nextDeviceCode(all);
    }
    expect(all).toHaveLength(DEVICE_CODES_PER_OUTLET);
    expect(DEVICE_CODES_PER_OUTLET).toBe(1295);
    expect(all.at(-1)).toBe('ZZ');
    expect(new Set(all).size).toBe(all.length);
    expect(all.every((c) => /^[0-9A-Z]{2}$/.test(c))).toBe(true);
  });
});
