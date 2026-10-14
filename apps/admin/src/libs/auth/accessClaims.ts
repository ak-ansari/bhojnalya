// What the admin reads from an access token's payload (TRD §13). The server
// signs and verifies the token; the browser only decodes it to decide what to
// show, so nothing here is a security check.
import { z } from 'zod';

export const AccessClaims = z.object({
  sub: z.string().min(1),
  tenant_id: z.string().optional(),
  scope: z.string().optional(),
  // Set only on a super admin's short-lived view-as token: who is acting.
  impersonated_by: z.string().min(1).optional(),
});
export type AccessClaims = z.infer<typeof AccessClaims>;

/** The token's claims, or `null` when it is missing, malformed or not ours. */
export function decodeAccessClaims(token: string | null): AccessClaims | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (payload === undefined) return null;
  try {
    const parsed = AccessClaims.safeParse(JSON.parse(decodeBase64Url(payload)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isImpersonating(claims: AccessClaims | null): boolean {
  return claims?.impersonated_by !== undefined;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
