// Opaque bearer secrets: device tokens and refresh tokens. Each is 256 random
// bits, shown to its holder once, and stored only as a SHA-256 hash, which is
// what the pre-sign-in lookups take (ADR 0019). A fast hash is enough because
// the secret is random, not chosen by a person; passwords use Argon2id.
import { createHash, randomBytes } from 'node:crypto';

// The prefix tells the auth guard which kind of bearer it holds without a lookup.
export const DEVICE_TOKEN_PREFIX = 'bdt_';
export const REFRESH_TOKEN_PREFIX = 'brt_';

export function newOpaqueToken(prefix: string): string {
  return prefix + randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
