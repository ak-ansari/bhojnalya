// A Drizzle handle over a node-postgres pool. The caller owns the pool and
// picks the role: app_user for the API, platform_admin for the cross-tenant
// module, bhojnalya_owner only for migrations (ADR 0005).
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import * as schema from './schema/index.js';

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function createDb(pool: Pool): Db {
  return drizzle(pool, { schema });
}
