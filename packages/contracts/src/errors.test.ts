import { describe, expect, it } from 'vitest';

import { ERROR_CODES, ErrorEnvelope } from './errors.js';

describe('ErrorEnvelope', () => {
  it('reads { code, message, details?, requestId }', () => {
    const body = {
      code: 'VALIDATION_FAILED',
      message: 'ops must hold at most 200 items',
      details: [{ path: ['ops'], message: 'too big' }],
      requestId: 'req_01a1391a',
    };
    expect(ErrorEnvelope.parse(body)).toEqual(body);
    expect(
      ErrorEnvelope.parse({ code: 'NOT_FOUND', message: 'no such invoice', requestId: 'r1' }),
    ).toEqual({
      code: 'NOT_FOUND',
      message: 'no such invoice',
      requestId: 'r1',
    });
  });

  it('requires a code, a message and a request id', () => {
    expect(ErrorEnvelope.safeParse({ message: 'x', requestId: 'r1' }).success).toBe(false);
    expect(ErrorEnvelope.safeParse({ code: 'NOT_FOUND', requestId: 'r1' }).success).toBe(false);
    expect(ErrorEnvelope.safeParse({ code: 'NOT_FOUND', message: 'x' }).success).toBe(false);
  });

  it('accepts a code it does not know yet but only in SCREAMING_SNAKE_CASE', () => {
    expect(
      ErrorEnvelope.safeParse({ code: 'INVOICE_NO_GAP', message: 'x', requestId: 'r1' }).success,
    ).toBe(true);
    expect(
      ErrorEnvelope.safeParse({ code: 'notFound', message: 'x', requestId: 'r1' }).success,
    ).toBe(false);
    expect(
      ErrorEnvelope.safeParse({ code: 'NOT__FOUND', message: 'x', requestId: 'r1' }).success,
    ).toBe(false);
  });
});

describe('ERROR_CODES', () => {
  it('spells the shared codes as their literals', () => {
    expect(Object.values(ERROR_CODES)).toEqual([
      'VALIDATION_FAILED',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'OUTLET_SUSPENDED',
      'INVALID_CREDENTIALS',
      'INVALID_RESET_CODE',
      'DEVICE_CODES_EXHAUSTED',
      'INTERNAL_ERROR',
    ]);
  });
});
