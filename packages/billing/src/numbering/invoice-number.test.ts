import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  formatInvoiceNo,
  INVOICE_NO_MAX_LENGTH,
  InvalidInvoiceNumberError,
  parseInvoiceNo,
  type InvoiceNumberField,
  type InvoiceNumberParts,
} from './invoice-number.js';

const valid: InvoiceNumberParts = { prefix: 'BL', deviceCode: '0A', fy: '2627', seq: 42 };

const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base36Char = fc.integer({ min: 0, max: 35 }).map((i) => BASE36.charAt(i));
const twoBase36 = fc.tuple(base36Char, base36Char).map(([a, b]) => a + b);
const validParts: fc.Arbitrary<InvoiceNumberParts> = fc.record({
  prefix: twoBase36,
  deviceCode: twoBase36,
  fy: fc
    .integer({ min: 0, max: 99 })
    .map((y) => String(y).padStart(2, '0') + String((y + 1) % 100).padStart(2, '0')),
  seq: fc.integer({ min: 1, max: 999_999 }),
});

function rejection(fn: () => unknown): InvoiceNumberField | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof InvalidInvoiceNumberError) return error.field;
    throw error;
  }
  return undefined;
}

describe('formatInvoiceNo', () => {
  it('writes PPDD/FYFY/NNNNNN in 16 characters', () => {
    expect(formatInvoiceNo(valid)).toBe('BL0A/2627/000042');
  });

  it.each([
    [{ seq: 1 }, 'BL0A/2627/000001'],
    [{ seq: 999_999 }, 'BL0A/2627/999999'],
    [{ prefix: 'Z9', deviceCode: 'ZZ', fy: '9900' }, 'Z9ZZ/9900/000042'],
  ])('writes %o as %s', (change, expected) => {
    expect(formatInvoiceNo({ ...valid, ...change })).toBe(expected);
  });

  it.each<[Partial<InvoiceNumberParts>, InvoiceNumberField]>([
    [{ prefix: 'B' }, 'prefix'],
    [{ prefix: 'BLR' }, 'prefix'],
    [{ prefix: 'bl' }, 'prefix'],
    [{ prefix: 'B/' }, 'prefix'],
    [{ prefix: 'B-' }, 'prefix'],
    [{ deviceCode: 'A' }, 'deviceCode'],
    [{ deviceCode: '0AB' }, 'deviceCode'],
    [{ deviceCode: '0a' }, 'deviceCode'],
    [{ deviceCode: '0_' }, 'deviceCode'],
    [{ fy: '2626' }, 'fy'],
    [{ fy: '26-27' }, 'fy'],
    [{ fy: '202627' }, 'fy'],
    [{ seq: 0 }, 'seq'],
    [{ seq: -1 }, 'seq'],
    [{ seq: 1_000_000 }, 'seq'],
    [{ seq: 1.5 }, 'seq'],
    [{ seq: Number.NaN }, 'seq'],
  ])('rejects %o as a bad %s', (change, field) => {
    expect(rejection(() => formatInvoiceNo({ ...valid, ...change }))).toBe(field);
  });

  it('never writes more than 16 characters', () => {
    fc.assert(
      fc.property(validParts, (parts) => {
        expect(formatInvoiceNo(parts).length).toBeLessThanOrEqual(INVOICE_NO_MAX_LENGTH);
      }),
    );
  });

  it('writes only the characters GST allows: letters, digits and /', () => {
    fc.assert(fc.property(validParts, (parts) => /^[A-Z0-9/]+$/.test(formatInvoiceNo(parts))));
  });

  it('throws an error that says what is wrong', () => {
    let thrown: unknown;
    try {
      formatInvoiceNo({ ...valid, seq: 0 });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(InvalidInvoiceNumberError);
    expect(thrown).toMatchObject({
      name: 'InvalidInvoiceNumberError',
      code: 'INVALID_INVOICE_NUMBER',
      field: 'seq',
      message: 'sequence must be a whole number from 1 to 999999, got 0',
    });
  });
});

describe('parseInvoiceNo', () => {
  it('reads an invoice number back into its parts', () => {
    expect(parseInvoiceNo('BL0A/2627/000042')).toEqual(valid);
  });

  it('is the exact inverse of formatInvoiceNo', () => {
    fc.assert(
      fc.property(validParts, (parts) => {
        const invoiceNo = formatInvoiceNo(parts);
        expect(parseInvoiceNo(invoiceNo)).toEqual(parts);
        expect(formatInvoiceNo(parseInvoiceNo(invoiceNo))).toBe(invoiceNo);
      }),
    );
  });

  it.each<[string, InvoiceNumberField]>([
    ['BL0A/2627/42', 'format'],
    ['BL0A-2627-000042', 'format'],
    ['bl0a/2627/000042', 'format'],
    ['BL0A/2627/0000042', 'format'],
    [' BL0A/2627/000042', 'format'],
    ['BL0A/2627/000042\n', 'format'],
    ['', 'format'],
    ['BL0A/2626/000042', 'fy'],
    ['BL0A/2627/000000', 'seq'],
  ])('rejects %j as a bad %s', (invoiceNo, field) => {
    expect(rejection(() => parseInvoiceNo(invoiceNo))).toBe(field);
  });

  it('rejects any string that formatInvoiceNo could not have written', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (text) => {
        const field = rejection(() => parseInvoiceNo(text));
        if (field === undefined) expect(formatInvoiceNo(parseInvoiceNo(text))).toBe(text);
      }),
    );
  });
});
