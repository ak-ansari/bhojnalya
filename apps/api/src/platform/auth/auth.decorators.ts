// What a route asks of its caller, read by the auth guard, and how a handler
// reads the caller. Every route without @Public needs a principal already
// (the tenant interceptor refuses one without); these narrow it further.
import { SetMetadata, createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { ApiError } from '../errors/api-error.js';
import type { ApiRequest, Principal } from '../http/api-request.js';
import type { Permission } from './permissions.js';

export const REQUIRED_PERMISSION = 'bhojnalya:required-permission';
export const DEVICE_ONLY = 'bhojnalya:device-only';

// A signed-in person holding the permission at the outlet the request acts for
// (or at any outlet, when it acts for none). A device never passes.
export function RequirePermission(permission: Permission): MethodDecorator & ClassDecorator {
  return SetMetadata(REQUIRED_PERMISSION, permission);
}

// Only a registered till or kitchen screen, e.g. sync.
export function DeviceOnly(): MethodDecorator & ClassDecorator {
  return SetMetadata(DEVICE_ONLY, true);
}

// The request's principal; 401 if there is none.
export const CurrentPrincipal = createParamDecorator(
  (_: unknown, context: ExecutionContext): Principal => {
    const { principal } = context.switchToHttp().getRequest<ApiRequest>();
    if (!principal) throw ApiError.unauthenticated();
    return principal;
  },
);
