import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { assertClockNotBehind, ClockBehindError } from './clock-guard.js';

const lastInvoiceAt = new Date('2026-10-14T10:00:00.000Z');

describe('assertClockNotBehind', () => {
  it('blocks billing when the clock reads earlier than the last invoice', () => {
    const now = new Date('2026-10-14T09:59:59.999Z');
    expect(() => {
      assertClockNotBehind(now, lastInvoiceAt);
    }).toThrow(ClockBehindError);
  });

  it('carries both instants on the error so the POS can tell staff how far behind', () => {
    const now = new Date('2026-10-14T09:00:00.000Z');
    let thrown: unknown;
    try {
      assertClockNotBehind(now, lastInvoiceAt);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ClockBehindError);
    expect(thrown).toMatchObject({
      name: 'ClockBehindError',
      code: 'CLOCK_BEHIND',
      now,
      lastInvoiceAt,
      message:
        'device clock 2026-10-14T09:00:00.000Z is behind the last invoice at 2026-10-14T10:00:00.000Z',
    });
  });

  it('allows the same instant as the last invoice', () => {
    expect(() => {
      assertClockNotBehind(new Date(lastInvoiceAt), lastInvoiceAt);
    }).not.toThrow();
  });

  it('allows a clock ahead of the last invoice', () => {
    expect(() => {
      assertClockNotBehind(new Date('2026-10-14T10:00:00.001Z'), lastInvoiceAt);
    }).not.toThrow();
  });

  it('allows any clock on a device with no invoice yet', () => {
    expect(() => {
      assertClockNotBehind(new Date('2000-01-01T00:00:00Z'), null);
    }).not.toThrow();
  });

  it('throws exactly when now is earlier than the last invoice', () => {
    const ms = fc.integer({ min: 0, max: Date.UTC(2100, 0, 1) });
    fc.assert(
      fc.property(ms, ms, (nowMs, lastMs) => {
        const behind = (() => {
          try {
            assertClockNotBehind(new Date(nowMs), new Date(lastMs));
            return false;
          } catch (error) {
            return error instanceof ClockBehindError;
          }
        })();
        expect(behind).toBe(nowMs < lastMs);
      }),
    );
  });

  it('refuses an invalid Date rather than letting it through', () => {
    expect(() => {
      assertClockNotBehind(new Date(Number.NaN), lastInvoiceAt);
    }).toThrow(RangeError);
    expect(() => {
      assertClockNotBehind(new Date(Number.NaN), null);
    }).toThrow(RangeError);
    expect(() => {
      assertClockNotBehind(new Date(), new Date(Number.NaN));
    }).toThrow(RangeError);
  });
});
