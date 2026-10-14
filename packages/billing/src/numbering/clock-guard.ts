/**
 * The clock guard: a device whose clock reads earlier than its last invoice
 * may not bill (TRD §7; ADR 0007). A clock running backwards would put bills
 * in the wrong financial year and out of order; refusing to bill is
 * recoverable, a bill in the wrong year is a filing error.
 */
import { instantMs } from './calendar.js';

/** Thrown when the device clock is behind the device's last invoice. */
export class ClockBehindError extends Error {
  readonly code = 'CLOCK_BEHIND';
  override readonly name = 'ClockBehindError';

  constructor(
    readonly now: Date,
    readonly lastInvoiceAt: Date,
  ) {
    super(
      `device clock ${now.toISOString()} is behind the last invoice at ${lastInvoiceAt.toISOString()}`,
    );
  }
}

/**
 * Throws `ClockBehindError` if `now` is earlier than `lastInvoiceAt`. The same
 * instant is allowed. `null` means the device has no invoice yet.
 */
export function assertClockNotBehind(now: Date, lastInvoiceAt: Date | null): void {
  if (lastInvoiceAt === null) return;
  if (instantMs(now) < instantMs(lastInvoiceAt)) throw new ClockBehindError(now, lastInvoiceAt);
}
