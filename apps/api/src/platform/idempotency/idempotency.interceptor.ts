// Idempotency-Key (TRD §14, ADR 0009): a mutating request that carries a key
// runs once per tenant and key for 24 hours. A retry with the same request gets
// the stored response, marked `Idempotent-Replayed: true`; the same key with a
// different request is refused with 409 CONFLICT.
//
// The key is claimed and the response stored inside the request's tenant
// transaction, so the stored response exists exactly when the request's writes
// do: a request that fails stores nothing and may be retried, and a concurrent
// duplicate waits on the claimed row, then replays.
import { createHash } from 'node:crypto';

import { IDEMPOTENCY_KEY_HEADER, IdempotencyKey } from '@bhojnalya/contracts';
import { Inject, Injectable, SetMetadata } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { from, lastValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';

import { ApiError } from '../errors/api-error.js';
import type { ApiRequest } from '../http/api-request.js';
import { READ_METHODS } from '../tenancy/suspended-outlet.interceptor.js';
import { tenantTxOf } from '../tenancy/tenant-transaction.interceptor.js';
import { claimKey, completeKey, findKey } from './idempotency-store.js';

export const REPLAYED_HEADER = 'Idempotent-Replayed';

const RESPONSE_HOLDS_SECRET = 'bhojnalya:response-holds-secret';

// The response carries a secret the server keeps only as a hash (a device
// token), so it is never stored for replay (ADR 0027). Such a route must be
// safe to retry some other way, e.g. by a client-made id that refuses a repeat.
export function ResponseHoldsSecret(): MethodDecorator {
  return SetMetadata(RESPONSE_HOLDS_SECRET, true);
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<ApiRequest>();
    const header = req.header(IDEMPOTENCY_KEY_HEADER);
    // Public routes have no tenant to scope a key to; reads need no key.
    if (
      header === undefined ||
      READ_METHODS.includes(req.method) ||
      !req.principal ||
      this.reflector.get<boolean | undefined>(RESPONSE_HOLDS_SECRET, context.getHandler()) === true
    ) {
      return next.handle();
    }
    const key = IdempotencyKey.safeParse(header);
    if (!key.success) {
      throw ApiError.validation(`${IDEMPOTENCY_KEY_HEADER} must be a lowercase UUID.`);
    }
    return from(this.once(req, http.getResponse<Response>(), key.data, next));
  }

  private async once(
    req: ApiRequest,
    res: Response,
    key: string,
    next: CallHandler,
  ): Promise<unknown> {
    const tx = tenantTxOf(req);
    const tenantId = req.principal?.tenantId ?? '';
    const request = { method: req.method, path: req.originalUrl, hash: requestHash(req) };
    if (!(await claimKey(tx, tenantId, key, request))) {
      const stored = await findKey(tx, tenantId, key);
      if (stored?.requestHash !== request.hash) {
        throw ApiError.conflict(
          `This ${IDEMPOTENCY_KEY_HEADER} was already used for a different request.`,
          { idempotencyKey: key },
        );
      }
      res.setHeader(REPLAYED_HEADER, 'true');
      return stored.responseBody;
    }
    const body: unknown = await lastValueFrom(next.handle(), { defaultValue: undefined });
    await completeKey(tx, tenantId, key, res.statusCode, body ?? null);
    return body;
  }
}

// Method, path and body: the same key may only ever mean the same request.
function requestHash(req: ApiRequest): string {
  return createHash('sha256')
    .update(JSON.stringify([req.method, req.originalUrl, req.body ?? null]))
    .digest('hex');
}
