// The auth guard (TRD §13): reads `Authorization: Bearer …`, sets req.principal
// for the tenant interceptor, and enforces @RequirePermission and @DeviceOnly.
// A device token (prefix bdt_) is looked up by its hash; anything else must be
// an access token this API signed. A request with no bearer gets no principal
// and is refused by the tenant interceptor unless the route is @Public.
import type { Db } from '@bhojnalya/db';
import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { z } from 'zod';

import { CLOCK } from '../clock.js';
import type { Clock } from '../clock.js';
import { DB } from '../db/database.module.js';
import { ApiError } from '../errors/api-error.js';
import type { ApiRequest, Principal } from '../http/api-request.js';
import { isPublic } from '../tenancy/tenant-transaction.interceptor.js';
import { AccessTokens } from './access-tokens.js';
import { DEVICE_ONLY, REQUIRED_PERMISSION } from './auth.decorators.js';
import { can } from './permissions.js';
import type { Permission } from './permissions.js';
import { devicePrincipal, userGrants, userPrincipal } from './principals.js';
import { DEVICE_TOKEN_PREFIX } from './secrets.js';

// The outlet a signed-in person acts for on this request (ADR 0027).
export const ACTING_OUTLET_HEADER = 'X-Outlet-Id';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessTokens) private readonly tokens: AccessTokens,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (isPublic(this.reflector, context)) return true;
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const bearer = bearerOf(req.header('authorization'));
    if (bearer !== undefined) {
      req.principal = await this.principalFor(bearer, req.header(ACTING_OUTLET_HEADER));
    }
    this.enforce(context, req.principal);
    return true;
  }

  private async principalFor(bearer: string, actingOutlet: string | undefined): Promise<Principal> {
    if (bearer.startsWith(DEVICE_TOKEN_PREFIX)) {
      const device = await devicePrincipal(this.db, bearer);
      if (!device) throw ApiError.unauthenticated('This device is not registered or was revoked.');
      return device;
    }
    const claims = await this.tokens.verify(bearer, this.clock.now());
    if (claims?.scope !== 'tenant' || claims.tenant_id === undefined) {
      throw ApiError.unauthenticated('The sign-in has expired. Sign in again.');
    }
    const user = { userId: claims.sub, tenantId: claims.tenant_id };
    const acting = actingOutletOf(actingOutlet);
    const grants = await userGrants(this.db, user);
    if (!grants) throw ApiError.unauthenticated('This account is disabled.');
    const principal = userPrincipal(user, grants, acting);
    if (principal === 'not-your-outlet') {
      throw ApiError.forbidden('You do not have access to this outlet.');
    }
    return principal;
  }

  private enforce(context: ExecutionContext, principal: Principal | undefined): void {
    const targets = [context.getHandler(), context.getClass()];
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      REQUIRED_PERMISSION,
      targets,
    );
    const deviceOnly = this.reflector.getAllAndOverride<boolean | undefined>(DEVICE_ONLY, targets);
    if (permission === undefined && deviceOnly !== true) return;
    if (!principal) throw ApiError.unauthenticated();
    if (deviceOnly === true && principal.deviceId === undefined) {
      throw ApiError.forbidden('Only a registered device may do this.');
    }
    if (permission !== undefined && !can(principal, permission)) {
      throw ApiError.forbidden('You do not have permission to do this.');
    }
  }
}

// The bearer token, undefined when there is no Authorization header, and 401
// when there is one that is not a bearer.
function bearerOf(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  const match = /^Bearer ([\w.~+/=-]+)$/i.exec(header.trim());
  if (!match?.[1]) throw ApiError.unauthenticated();
  return match[1];
}

function actingOutletOf(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  const parsed = z.uuid().safeParse(header);
  if (!parsed.success) throw ApiError.validation(`${ACTING_OUTLET_HEADER} must be a UUID.`);
  return parsed.data;
}
