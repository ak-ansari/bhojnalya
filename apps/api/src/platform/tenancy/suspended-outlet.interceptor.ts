// The suspended-outlet guard (TRD §13, ADR 0015): a request that changes
// anything for a suspended outlet is refused with 402 OUTLET_SUSPENDED, in this
// one place, never per handler. Reads always pass, and a route marked
// @AllowWhenSuspended (record-keeping) passes too.
//
// An interceptor rather than a Nest guard so it runs after the auth guard has
// set the principal, and reads the outlet inside the request's own tenant
// transaction instead of opening a second one.
import { outlets } from '@bhojnalya/db';
import type { Tx } from '@bhojnalya/db';
import { Inject, Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { from, switchMap, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import { ApiError } from '../errors/api-error.js';
import type { ApiRequest } from '../http/api-request.js';
import { ALLOWED_WHEN_SUSPENDED } from './public.decorator.js';
import { isPublic, tenantTxOf } from './tenant-transaction.interceptor.js';

export const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class SuspendedOutletInterceptor implements NestInterceptor {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const outletId = req.principal?.outletId;
    if (
      outletId === undefined ||
      READ_METHODS.includes(req.method) ||
      isPublic(this.reflector, context) ||
      this.isAllowedWhenSuspended(context)
    ) {
      return next.handle();
    }
    return from(outletStatus(tenantTxOf(req), outletId)).pipe(
      switchMap((status) => {
        if (status === undefined) {
          return throwError(() => ApiError.forbidden('This outlet is not reachable.'));
        }
        if (status === 'suspended') {
          return throwError(() => ApiError.outletSuspended(outletId));
        }
        return next.handle();
      }),
    );
  }

  private isAllowedWhenSuspended(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(ALLOWED_WHEN_SUSPENDED, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}

async function outletStatus(tx: Tx, outletId: string): Promise<string | undefined> {
  const [row] = await tx
    .select({ status: outlets.status })
    .from(outlets)
    .where(eq(outlets.id, outletId));
  return row?.status;
}
