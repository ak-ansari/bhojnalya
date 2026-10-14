/**
 * Invoice numbers from a device series: `{PP}{DD}/{FYFY}/{NNNNNN}`, e.g.
 * `BL0A/2627/000042` (TRD §7; ADR 0007). The POS formats one for every
 * invoice it writes; the server parses them back to find gaps in a device's
 * series.
 *
 * Every valid number is exactly 16 characters, the GST limit, because every
 * part has a fixed width. Validating the parts is what keeps a number within
 * the limit; there is no separate length check to fall out of step with it.
 */
import { isFinancialYear } from './calendar.js';

/** The parts of an invoice number. */
export interface InvoiceNumberParts {
  /** Outlet prefix: two characters, `A-Z` or `0-9`. */
  readonly prefix: string;
  /** Device code: two base36 characters, upper case, issued by the server. */
  readonly deviceCode: string;
  /** Financial year as `financialYear` writes it, e.g. `"2627"`. */
  readonly fy: string;
  /** The device's sequence within the year, 1 to 999,999. */
  readonly seq: number;
}

/** GST caps an invoice number at 16 characters. */
export const INVOICE_NO_MAX_LENGTH = 16;

/** Six digits: the most bills one device issues in one financial year. */
export const INVOICE_SEQ_MAX = 999_999;

/** Which part of an invoice number was wrong. */
export type InvoiceNumberField = 'prefix' | 'deviceCode' | 'fy' | 'seq' | 'format';

/** Thrown for a part, or a whole number, that is not a valid invoice number. */
export class InvalidInvoiceNumberError extends Error {
  readonly code = 'INVALID_INVOICE_NUMBER';
  override readonly name = 'InvalidInvoiceNumberError';

  constructor(
    readonly field: InvoiceNumberField,
    message: string,
  ) {
    super(message);
  }
}

/** Writes an invoice number, e.g. `BL0A/2627/000042`. Throws on any invalid part. */
export function formatInvoiceNo(parts: InvoiceNumberParts): string {
  assertValidParts(parts);
  const { prefix, deviceCode, fy, seq } = parts;
  return `${prefix}${deviceCode}/${fy}/${String(seq).padStart(6, '0')}`;
}

/** Reads an invoice number back into its parts; the exact inverse of `formatInvoiceNo`. */
export function parseInvoiceNo(invoiceNo: string): InvoiceNumberParts {
  if (!INVOICE_NO_SHAPE.test(invoiceNo)) {
    throw new InvalidInvoiceNumberError(
      'format',
      `"${invoiceNo}" is not of the form PPDD/FYFY/NNNNNN`,
    );
  }
  const parts: InvoiceNumberParts = {
    prefix: invoiceNo.slice(0, 2),
    deviceCode: invoiceNo.slice(2, 4),
    fy: invoiceNo.slice(5, 9),
    seq: Number(invoiceNo.slice(10, 16)),
  };
  assertValidParts(parts);
  return parts;
}

const PREFIX = /^[A-Z0-9]{2}$/;
const DEVICE_CODE = /^[0-9A-Z]{2}$/;
const INVOICE_NO_SHAPE = /^[A-Z0-9]{4}\/\d{4}\/\d{6}$/;

function assertValidParts({ prefix, deviceCode, fy, seq }: InvoiceNumberParts): void {
  if (!PREFIX.test(prefix)) {
    throw new InvalidInvoiceNumberError('prefix', `prefix must be 2 of A-Z/0-9, got "${prefix}"`);
  }
  if (!DEVICE_CODE.test(deviceCode)) {
    throw new InvalidInvoiceNumberError(
      'deviceCode',
      `device code must be 2 upper-case base36 characters, got "${deviceCode}"`,
    );
  }
  if (!isFinancialYear(fy)) {
    throw new InvalidInvoiceNumberError('fy', `financial year must look like "2627", got "${fy}"`);
  }
  if (!Number.isInteger(seq) || seq < 1 || seq > INVOICE_SEQ_MAX) {
    throw new InvalidInvoiceNumberError(
      'seq',
      `sequence must be a whole number from 1 to ${String(INVOICE_SEQ_MAX)}, got ${String(seq)}`,
    );
  }
}
