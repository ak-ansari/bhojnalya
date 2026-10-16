import { describe, expect, it } from 'vitest';

import { Argon2PasswordHasher } from './argon2-password-hasher.js';

const hasher = new Argon2PasswordHasher();

describe('Argon2PasswordHasher', () => {
  it('stores an Argon2id hash with 19 MiB, 2 passes and one lane, never the password', async () => {
    const stored = await hasher.hash('masala-chai-2026');
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(stored).not.toContain('masala-chai-2026');
  });

  it('verifies the right password and refuses a wrong one or a malformed hash', async () => {
    const stored = await hasher.hash('masala-chai-2026');
    expect(await hasher.verify(stored, 'masala-chai-2026')).toBe(true);
    expect(await hasher.verify(stored, 'masala-chai-2027')).toBe(false);
    expect(await hasher.verify('not-a-hash', 'masala-chai-2026')).toBe(false);
  });
});
