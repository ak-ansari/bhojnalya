// Every request that is not @Public runs in one transaction opened by withTenant,
// whose first statement sets app.tenant_id and app.outlet_ids for RLS (TRD §5.2,
// ADR 0005). Handlers and repositories receive that transaction through
// @TenantTx and never open their own. A thrown error rolls all of it back.
import { withTenant } from '@bhojnalya/db';
import type { Db, Tx } from '@bhojnalya/db';
import { Inject, Injectable, createParamDecorator } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { from, lastValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';

import { DB } from '../db/database.module.js';
import { ApiError } from '../errors/api-error.js';
import type { ApiRequest } from '../http/api-request.js';
import { PUBLIC_ROUTE } from './public.decorator.js';

@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (isPublic(this.reflector, context)) return next.handle();
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const { principal } = req;
    // The auth guard (ticket 13) sets the principal; without one nothing runs.
    if (!principal) throw ApiError.unauthenticated();
    this.logger.assign({
      tenantId: principal.tenantId,
      outletId: principal.outletId,
      deviceId: principal.deviceId,
    });
    return from(
      withTenant(this.db, principal, async (tx): Promise<unknown> => {
        req.tenantTx = tx;
        try {
          const result: unknown = await lastValueFrom(next.handle(), { defaultValue: undefined });
          return result;
        } finally {
          req.tenantTx = undefined;
        }
      }),
    );
  }
}

// The request's tenant transaction, for a handler to pass to its use case.
export const TenantTx = createParamDecorator((_: unknown, context: ExecutionContext): Tx => {
  return tenantTxOf(context.switchToHttp().getRequest<ApiRequest>());
});

export function tenantTxOf(req: ApiRequest): Tx {
  if (!req.tenantTx) {
    throw new Error('No tenant transaction: the route is @Public or ran outside the interceptor.');
  }
  return req.tenantTx;
}

export function isPublic(reflector: Reflector, context: ExecutionContext): boolean {
  return (
    reflector.getAllAndOverride<boolean | undefined>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]) === true
  );
}
