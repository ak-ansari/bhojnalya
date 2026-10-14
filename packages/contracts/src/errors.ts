// The error envelope every API error uses (TRD §14): { code, message, details?, requestId }.
import { z } from 'zod';

/**
 * Codes shared by more than one module. A module adds its own codes here, so
 * each is defined once; clients still accept any well-formed code, so an older
 * client can read an error from a newer server.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  OUTLET_SUSPENDED: 'OUTLET_SUSPENDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type KnownErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** A machine-readable code: SCREAMING_SNAKE_CASE. */
export const ErrorCode = z
  .string()
  .regex(/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/, 'error codes are SCREAMING_SNAKE_CASE');

export const ErrorEnvelope = z.object({
  code: ErrorCode,
  /** For people; clients branch on `code`, never on this text. */
  message: z.string().min(1),
  details: z.unknown().optional(),
  /** Also in the server's logs and error tracker, so a report can be traced. */
  requestId: z.string().min(1),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
