// The migrate step as a command: `node dist/migrate.js`, with
// MIGRATION_DATABASE_URL pointing at bhojnalya_owner. Run before the API starts.
import { z } from 'zod';

import { migrate } from './platform/db/migrate.js';

const url = z
  .url({ protocol: /^postgres(ql)?$/ })
  .parse(process.env.MIGRATION_DATABASE_URL, { error: () => 'Set MIGRATION_DATABASE_URL.' });
await migrate(url);
