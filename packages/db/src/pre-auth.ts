// Pre-authentication resolvers (ADR 0019): the caller holds a login, a token
// hash or a QR token, but no tenant yet. Each returns only the ids needed to
// open withTenant; the row itself is then read under RLS. Called on a plain
// app_user handle, outside any tenant context.
import { sql } from 'drizzle-orm';

import type { Db, Tx } from './client.js';

export interface ResolvedLogin {
  tenantId: string;
  userId: string;
}

export interface ResolvedDevice {
  tenantId: string;
  outletId: string;
  deviceId: string;
}

export interface ResolvedRefreshToken {
  tenantId: string;
  userId: string;
  refreshTokenId: string;
}

export interface ResolvedTable {
  tenantId: string;
  outletId: string;
  tableId: string;
}

// Email (any case) or phone.
export async function resolveLogin(db: Db | Tx, login: string): Promise<ResolvedLogin | null> {
  const { rows } = await db.execute<{ tenant_id: string; user_id: string }>(
    sql`SELECT tenant_id, user_id FROM app.resolve_login(${login})`,
  );
  const row = rows[0];
  return row ? { tenantId: row.tenant_id, userId: row.user_id } : null;
}

export async function resolveDeviceToken(
  db: Db | Tx,
  tokenHash: string,
): Promise<ResolvedDevice | null> {
  const { rows } = await db.execute<{ tenant_id: string; outlet_id: string; device_id: string }>(
    sql`SELECT tenant_id, outlet_id, device_id FROM app.resolve_device_token(${tokenHash})`,
  );
  const row = rows[0];
  return row ? { tenantId: row.tenant_id, outletId: row.outlet_id, deviceId: row.device_id } : null;
}

export async function resolveRefreshToken(
  db: Db | Tx,
  tokenHash: string,
): Promise<ResolvedRefreshToken | null> {
  const { rows } = await db.execute<{
    tenant_id: string;
    user_id: string;
    refresh_token_id: string;
  }>(sql`SELECT tenant_id, user_id, refresh_token_id FROM app.resolve_refresh_token(${tokenHash})`);
  const row = rows[0];
  return row
    ? { tenantId: row.tenant_id, userId: row.user_id, refreshTokenId: row.refresh_token_id }
    : null;
}

export async function resolveQrToken(db: Db | Tx, qrToken: string): Promise<ResolvedTable | null> {
  const { rows } = await db.execute<{ tenant_id: string; outlet_id: string; table_id: string }>(
    sql`SELECT tenant_id, outlet_id, table_id FROM app.resolve_qr_token(${qrToken})`,
  );
  const row = rows[0];
  return row ? { tenantId: row.tenant_id, outletId: row.outlet_id, tableId: row.table_id } : null;
}

export interface ResolvedAggregatorStore {
  tenantId: string;
  outletId: string;
  linkId: string;
}

// An aggregator webhook names only the provider and its store (ADR 0021).
export async function resolveAggregatorStore(
  db: Db | Tx,
  provider: string,
  extStoreId: string,
): Promise<ResolvedAggregatorStore | null> {
  const { rows } = await db.execute<{ tenant_id: string; outlet_id: string; link_id: string }>(
    sql`SELECT tenant_id, outlet_id, link_id FROM app.resolve_aggregator_store(${provider}, ${extStoreId})`,
  );
  const row = rows[0];
  return row ? { tenantId: row.tenant_id, outletId: row.outlet_id, linkId: row.link_id } : null;
}
