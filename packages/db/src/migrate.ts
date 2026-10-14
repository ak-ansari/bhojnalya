// Applies the committed SQL migrations. Run as bhojnalya_owner, in its own
// step before the API starts, never as app_user (TRD §5.2).
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

// Resolves from both src/ (tests) and dist/ (built) to packages/db/migrations.
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../migrations', import.meta.url));

export async function runMigrations(ownerConnectionString: string): Promise<void> {
  const client = new pg.Client({ connectionString: ownerConnectionString });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}
