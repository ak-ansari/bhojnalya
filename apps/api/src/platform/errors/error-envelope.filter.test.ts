import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ApiError } from './api-error.js';
import { toError } from './error-envelope.filter.js';

describe('toError', () => {
  it('keeps an ApiError’s status, code, message and details', () => {
    expect(toError(ApiError.outletSuspended('o-1'))).toEqual({
      status: 402,
      code: 'OUTLET_SUSPENDED',
      message: expect.any(String) as unknown,
      details: { outletId: 'o-1' },
    });
  });

  it("maps Nest's HTTP exceptions to the shared codes by status", () => {
    expect(toError(new NotFoundException())).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(toError(new BadRequestException())).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
    });
    expect(toError(new PayloadTooLargeException())).toMatchObject({
      status: 413,
      code: 'VALIDATION_FAILED',
    });
  });

  it('maps an error carrying a 4xx status, as the body parser throws, to that status', () => {
    expect(toError(Object.assign(new Error('too big'), { status: 413 }))).toMatchObject({
      status: 413,
      code: 'VALIDATION_FAILED',
    });
  });

  it("turns anything else into 500 INTERNAL_ERROR without the error's own message", () => {
    expect(toError(new Error('password=hunter2'))).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    });
    expect(toError(Object.assign(new Error('x'), { status: 503 }))).toMatchObject({ status: 500 });
  });
});
