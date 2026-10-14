import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { businessDate, financialYear, isFinancialYear } from './calendar.js';

// Tests run in UTC; every IST expectation below is written out by hand.
const at = (iso: string) => new Date(iso);

/** Any instant from 2000 to 2099, at millisecond resolution. */
const instants = fc
  .integer({ min: Date.UTC(2000, 0, 1), max: Date.UTC(2099, 11, 31) })
  .map((ms) => new Date(ms));

/** The IST calendar date by the platform's time-zone database, as a cross-check. */
const istDateByTzDatabase = (instant: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(instant);

describe('financialYear', () => {
  it('turns at 1 April 00:00 IST, which is 31 March 18:30 UTC', () => {
    expect(financialYear(at('2027-03-31T18:29:59.999Z'))).toBe('2627');
    expect(financialYear(at('2027-03-31T18:30:00.000Z'))).toBe('2728');
  });

  it.each([
    ['2026-04-01T00:00:00+05:30', '2627'],
    ['2026-03-31T23:59:59+05:30', '2526'],
    ['2026-10-14T12:00:00Z', '2627'],
    ['2027-01-01T00:00:00+05:30', '2627'],
    ['2026-12-31T20:00:00Z', '2627'], // 1 Jan 01:30 IST, same FY
    ['2099-04-01T00:00:00+05:30', '9900'],
    ['2000-03-31T12:00:00Z', '9900'],
    ['2009-06-01T00:00:00Z', '0910'],
  ])('puts %s in FY %s', (iso, fy) => {
    expect(financialYear(at(iso))).toBe(fy);
  });

  it('agrees with the time-zone database for Asia/Kolkata at every instant', () => {
    fc.assert(
      fc.property(instants, (instant) => {
        const [y, m] = istDateByTzDatabase(instant).split('-').map(Number) as [number, number];
        const start = m >= 4 ? y : y - 1;
        const expected =
          String(start % 100).padStart(2, '0') + String((start + 1) % 100).padStart(2, '0');
        expect(financialYear(instant)).toBe(expected);
      }),
    );
  });

  it('always writes a well-formed financial year', () => {
    fc.assert(fc.property(instants, (instant) => isFinancialYear(financialYear(instant))));
  });

  it('refuses an invalid Date', () => {
    expect(() => financialYear(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe('isFinancialYear', () => {
  it.each([
    ['2627', true],
    ['9900', true],
    ['0001', true],
    ['2626', false],
    ['2628', false],
    ['0099', false],
    ['262', false],
    ['26270', false],
    ['26-7', false],
    ['', false],
  ])('%s → %s', (fy, valid) => {
    expect(isFinancialYear(fy)).toBe(valid);
  });
});

describe('businessDate', () => {
  it('puts 02:00 IST into the previous day with a 4 AM cutoff', () => {
    expect(businessDate(at('2026-10-15T02:00:00+05:30'), 4)).toBe('2026-10-14');
  });

  it.each([
    ['2026-10-15T03:59:59.999+05:30', 4, '2026-10-14'],
    ['2026-10-15T04:00:00+05:30', 4, '2026-10-15'],
    ['2026-10-14T23:59:59+05:30', 4, '2026-10-14'],
    ['2026-10-14T18:30:00Z', 0, '2026-10-15'], // midnight IST
    ['2026-10-14T18:29:59.999Z', 0, '2026-10-14'],
    ['2026-03-01T01:00:00+05:30', 4, '2026-02-28'],
    ['2028-03-01T01:00:00+05:30', 4, '2028-02-29'],
    ['2027-01-01T03:00:00+05:30', 4, '2026-12-31'],
    ['2026-10-15T22:30:00+05:30', 23, '2026-10-14'],
  ])('%s with cutoff %i is business date %s', (iso, cutoff, date) => {
    expect(businessDate(at(iso), cutoff)).toBe(date);
  });

  it('is the IST calendar date when the cutoff is midnight', () => {
    fc.assert(
      fc.property(instants, (instant) => {
        expect(businessDate(instant, 0)).toBe(istDateByTzDatabase(instant));
      }),
    );
  });

  it('is the IST date of the instant moved back by the cutoff', () => {
    fc.assert(
      fc.property(instants, fc.integer({ min: 0, max: 23 }), (instant, cutoff) => {
        const earlier = new Date(instant.getTime() - cutoff * 3_600_000);
        expect(businessDate(instant, cutoff)).toBe(istDateByTzDatabase(earlier));
      }),
    );
  });

  it.each([-1, 24, 4.5, Number.NaN])('refuses cutoff hour %s', (cutoff) => {
    expect(() => businessDate(at('2026-10-14T00:00:00Z'), cutoff)).toThrow(RangeError);
  });

  it('refuses an invalid Date', () => {
    expect(() => businessDate(new Date(Number.NaN), 4)).toThrow(RangeError);
  });
});
