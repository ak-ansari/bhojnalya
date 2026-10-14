// A JWT-shaped token carrying the given claims, for tests. The signature is a
// dummy: the admin never verifies tokens, the API does.
export function makeAccessToken(claims: Record<string, unknown>): string {
  return ['eyJhbGciOiJub25lIn0', encodeBase64Url(JSON.stringify(claims)), 'signature'].join('.');
}

function encodeBase64Url(text: string): string {
  const binary = Array.from(new TextEncoder().encode(text), (byte) =>
    String.fromCharCode(byte),
  ).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
