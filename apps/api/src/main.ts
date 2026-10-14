// The API process: reads its configuration and listens. Migrations are a
// separate step (migrate.ts), run as the owner before this starts (TRD §15.2).
import { createApp } from './app.js';
import { loadConfig } from './platform/config.js';

const config = loadConfig(process.env);
const app = await createApp({ config });
await app.listen(config.PORT, '0.0.0.0');
