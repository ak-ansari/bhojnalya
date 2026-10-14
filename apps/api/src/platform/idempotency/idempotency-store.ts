// The idempotency_keys queries, always on the request's tenant transaction, so
// RLS scopes every key to its tenant (TRD §5.2).
import { idempotencyKeys } from '@bhojnalya/db';
import type { Tx } from '@bhojnalya/db';
import { and, eq, sql } from 'drizzle-orm';

export const KEY_LIFETIME = sql`interval '24 hours'`;

export interface KeyedRequest {
  method: string;
  path: string;
  hash: string;
}

export interface StoredResponse {
  requestHash: string;
  statusCode: number | null;
  responseBody: unknown;
}

// True when this request now owns the key: it was new, or its last use has
// expired. Blocks while another open transaction holds the same key.
export async function claimKey(
  tx: Tx,
  tenantId: string,
  key: string,
  request: KeyedRequest,
): Promise<boolean> {
  const claimed = await tx
    .insert(idempotencyKeys)
    .values({
      tenantId,
      key,
      requestHash: request.hash,
      method: request.method,
      path: request.path,
      expiresAt: sql`now() + ${KEY_LIFETIME}`,
    })
    .onConflictDoUpdate({
      target: [idempotencyKeys.tenantId, idempotencyKeys.key],
      set: {
        requestHash: sql`excluded.request_hash`,
        method: sql`excluded.method`,
        path: sql`excluded.path`,
        statusCode: null,
        responseBody: null,
        createdAt: sql`now()`,
        expiresAt: sql`excluded.expires_at`,
      },
      setWhere: sql`${idempotencyKeys.expiresAt} <= now()`,
    })
    .returning({ key: idempotencyKeys.key });
  return claimed.length === 1;
}

export async function findKey(
  tx: Tx,
  tenantId: string,
  key: string,
): Promise<StoredResponse | undefined> {
  const [row] = await tx
    .select({
      requestHash: idempotencyKeys.requestHash,
      statusCode: idempotencyKeys.statusCode,
      responseBody: idempotencyKeys.responseBody,
    })
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.key, key)));
  return row;
}

export async function completeKey(
  tx: Tx,
  tenantId: string,
  key: string,
  statusCode: number,
  responseBody: unknown,
): Promise<void> {
  await tx
    .update(idempotencyKeys)
    .set({ statusCode, responseBody })
    .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.key, key)));
}
