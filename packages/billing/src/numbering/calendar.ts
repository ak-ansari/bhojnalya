/**
 * Indian dates for invoices and reports: the financial year an invoice belongs
 * to, and the business date a sale counts towards. Both are read in Indian
 * Standard Time, never in the machine's own zone (TRD §7, §13; ADR 0016).
 *
 * Pure: the instant is an argument, never `Date.now()`.
 */

/** IST is UTC+05:30 all year. India has observed no daylight saving since 1945. */
export const IST_OFFSET_MINUTES = 330;

/**
 * The financial year an instant falls in, as four digits: `"2627"` is
 * FY 2026-27. The year turns at 1 April 00:00 IST (31 March 18:30 UTC).
 */
export function financialYear(instant: Date): string {
  const { year, month } = istCalendarDate(instant);
  const startYear = month >= APRIL ? year : year - 1;
  return lastTwoDigits(startYear) + lastTwoDigits(startYear + 1);
}

/**
 * Whether `fy` is a financial year as `financialYear` writes it: four digits,
 * the second pair one year after the first (`"9900"` follows `"9899"`).
 */
export function isFinancialYear(fy: string): boolean {
  if (!/^\d{4}$/.test(fy)) return false;
  const start = Number(fy.slice(0, 2));
  const end = Number(fy.slice(2));
  return end === (start + 1) % 100;
}

/**
 * The business date (`YYYY-MM-DD`, IST) a sale at `instant` counts towards.
 * A café that closes after midnight sets a day-end cutoff: with a 4 AM cutoff,
 * 02:00 IST on the 15th is still the 14th's business. `cutoffHour` is a whole
 * hour, 0 to 23; 0 means the business day is the calendar day.
 */
export function businessDate(instant: Date, cutoffHour: number): string {
  if (!Number.isInteger(cutoffHour) || cutoffHour < 0 || cutoffHour > 23) {
    throw new RangeError(`cutoffHour must be a whole hour from 0 to 23, got ${String(cutoffHour)}`);
  }
  const { year, month, day } = istCalendarDate(
    new Date(instantMs(instant) - cutoffHour * MS_PER_HOUR),
  );
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Milliseconds since the epoch, refusing an invalid `Date`. */
export function instantMs(instant: Date): number {
  const ms = instant.getTime();
  if (Number.isNaN(ms)) throw new RangeError('instant is an invalid Date');
  return ms;
}

const APRIL = 4;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** The IST wall-calendar date of an instant: shift by the fixed offset, read as UTC. */
function istCalendarDate(instant: Date): { year: number; month: number; day: number } {
  const ist = new Date(instantMs(instant) + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  return { year: ist.getUTCFullYear(), month: ist.getUTCMonth() + 1, day: ist.getUTCDate() };
}

function lastTwoDigits(year: number): string {
  return pad2(year % 100);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
