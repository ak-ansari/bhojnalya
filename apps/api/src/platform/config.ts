// The API's configuration, read once from the environment (12-factor, TRD §15.5)
// and validated, so a missing variable stops the process at start, not mid-request.
import { z } from 'zod';

export const ApiConfig = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  // app_user: no BYPASSRLS, owns nothing (TRD §5.2).
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // TRD §15.2: 10 of Postgres's 50 connections.
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});
export type ApiConfig = z.infer<typeof ApiConfig>;

export const API_CONFIG = Symbol('API_CONFIG');

export function loadConfig(env: Record<string, string | undefined>): ApiConfig {
  const parsed = ApiConfig.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid API configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
