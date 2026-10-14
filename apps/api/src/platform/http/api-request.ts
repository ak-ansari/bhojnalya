// What the platform hangs on each request: its id (from the logger middleware),
// the authenticated principal (from the auth guard) and the tenant transaction
// (from the tenant interceptor).
import type { Tx } from '@bhojnalya/db';
import type { Request } from 'express';

export interface Principal {
  tenantId: string;
  // Outlets the principal may reach; becomes app.outlet_ids (TRD §5.2).
  outletIds: readonly string[];
  // The outlet this request acts for, when there is one: a device's own outlet,
  // or the outlet an owner picked. Suspension is checked against it (ADR 0015).
  outletId?: string;
  deviceId?: string;
  userId?: string;
}

export interface ApiRequest extends Request {
  // Set by pino-http before anything else runs.
  id: string | number | object;
  principal?: Principal;
  tenantTx?: Tx;
}

export function requestIdOf(req: { id?: unknown }): string {
  return typeof req.id === 'string' && req.id !== '' ? req.id : 'unknown';
}
