// The migrate step, run as bhojnalya_owner before the API starts (TRD §5.2,
// §15.2): the committed SQL migrations, then pg-boss's tables in the schema
// they created (ADR 0020). The API itself connects as app_user and runs no DDL.
import { runMigrations } from '@bhojnalya/db';

import { installJobs } from '../jobs/jobs.module.js';

export async function migrate(ownerConnectionString: string): Promise<void> {
  await runMigrations(ownerConnectionString);
  await installJobs(ownerConnectionString);
}
