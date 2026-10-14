// Route markers the tenancy layer reads. Every route is tenant-scoped unless it
// says otherwise, so forgetting a marker fails closed (401), never open.
import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE = 'bhojnalya:public';
export const ALLOWED_WHEN_SUSPENDED = 'bhojnalya:allowed-when-suspended';

// No principal and no tenant transaction: health checks, the API document,
// and the sign-in routes that find the tenant (ADR 0019).
export function Public(): MethodDecorator & ClassDecorator {
  return SetMetadata(PUBLIC_ROUTE, true);
}

// Record-keeping a suspended outlet may still do: syncing invoices it already
// issued and billing food already sent to the kitchen (ADR 0015).
export function AllowWhenSuspended(): MethodDecorator & ClassDecorator {
  return SetMetadata(ALLOWED_WHEN_SUSPENDED, true);
}
