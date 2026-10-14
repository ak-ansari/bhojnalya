// The one error type handlers throw. The exception filter turns it into the
// envelope { code, message, details?, requestId } (TRD §14); codes come from
// packages/contracts so each is defined once.
import { ERROR_CODES } from '@bhojnalya/contracts';
import type { KnownErrorCode } from '@bhojnalya/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: KnownErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(400, ERROR_CODES.VALIDATION_FAILED, message, details);
  }

  static unauthenticated(message = 'Sign in to continue.'): ApiError {
    return new ApiError(401, ERROR_CODES.UNAUTHENTICATED, message);
  }

  static forbidden(message: string): ApiError {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, ERROR_CODES.CONFLICT, message, details);
  }

  // 402: the subscription, not the caller's rights, is what stops it (ADR 0015).
  static outletSuspended(outletId: string): ApiError {
    return new ApiError(
      402,
      ERROR_CODES.OUTLET_SUSPENDED,
      'This outlet is suspended: it can be viewed but takes no new orders or changes.',
      { outletId },
    );
  }
}
