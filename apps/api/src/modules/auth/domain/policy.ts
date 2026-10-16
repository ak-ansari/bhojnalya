// How long the owner's secrets last and how many guesses a reset code allows
// (TRD §13). Pure values and rules; no I/O.
import { randomInt } from 'node:crypto';

// A refresh token is good for 30 days from its own issue; each use replaces it.
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const RESET_CODE_TTL_MS = 10 * 60 * 1000;

// A six-digit code survives this many wrong guesses, then is spent.
export const MAX_RESET_CODE_ATTEMPTS = 5;

export function newResetCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function addMs(at: Date, ms: number): Date {
  return new Date(at.getTime() + ms);
}
