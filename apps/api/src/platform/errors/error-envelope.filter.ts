// Every error leaves the API as { code, message, details?, requestId } (TRD §14),
// whatever threw it: an ApiError, Nest's own HttpException (unknown route), the
// body parser (malformed JSON) or a bug. A bug's message never reaches the client.
import { ERROR_CODES } from '@bhojnalya/contracts';
import type { ErrorEnvelope, KnownErrorCode } from '@bhojnalya/contracts';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

import type { ApiRequest } from '../http/api-request.js';
import { requestIdOf } from '../http/api-request.js';
import { ApiError } from './api-error.js';

@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger('ErrorEnvelopeFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<ApiRequest>();
    const res = http.getResponse<Response>();
    const { status, code, message, details } = toError(exception);
    if (status >= 500) {
      this.logger.error(exception);
    }
    const body: ErrorEnvelope = {
      code,
      message,
      ...(details === undefined ? {} : { details }),
      requestId: requestIdOf(req),
    };
    res.status(status).json(body);
  }
}

interface MappedError {
  status: number;
  code: KnownErrorCode;
  message: string;
  details?: unknown;
}

export function toError(exception: unknown): MappedError {
  if (exception instanceof ApiError) {
    return {
      status: exception.status,
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return { status, code: codeForStatus(status), message: exception.message };
  }
  // body-parser's errors carry an HTTP status but are not HttpExceptions.
  const status = clientStatusOf(exception);
  if (status !== undefined) {
    return { status, code: codeForStatus(status), message: 'The request could not be read.' };
  }
  return { status: 500, code: ERROR_CODES.INTERNAL_ERROR, message: 'Something went wrong.' };
}

function codeForStatus(status: number): KnownErrorCode {
  switch (status) {
    case 401:
      return ERROR_CODES.UNAUTHENTICATED;
    case 402:
      return ERROR_CODES.OUTLET_SUSPENDED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    default:
      return status >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.VALIDATION_FAILED;
  }
}

function clientStatusOf(exception: unknown): number | undefined {
  if (typeof exception !== 'object' || exception === null || !('status' in exception)) {
    return undefined;
  }
  const { status } = exception;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
}
