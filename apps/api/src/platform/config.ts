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
  // Signs access tokens and keys reset-code hashes (TRD §13). When unset, each
  // process makes its own, so a restart only sends signed-in clients to refresh.
  AUTH_TOKEN_SECRET: z.string().min(32).optional(),
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
