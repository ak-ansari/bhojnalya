import { describe, expect, it } from 'vitest';

import { LoginSchema } from './loginSchema';

const PASSWORD = 'correct horse';

describe('LoginSchema', () => {
  it('accepts an email address or a 10-digit Indian mobile number', () => {
    expect(
      LoginSchema.safeParse({ identifier: 'owner@brewbun.in', password: PASSWORD }).success,
    ).toBe(true);
    expect(LoginSchema.safeParse({ identifier: '9876543210', password: PASSWORD }).success).toBe(
      true,
    );
    expect(LoginSchema.safeParse({ identifier: '6000000000', password: PASSWORD }).success).toBe(
      true,
    );
  });

  it('trims the identifier before checking it', () => {
    expect(LoginSchema.parse({ identifier: '  9876543210 ', password: PASSWORD }).identifier).toBe(
      '9876543210',
    );
  });

  it.each([
    ['empty', ''],
    ['nine digits', '987654321'],
    ['eleven digits', '98765432101'],
    ['a number starting with 5', '5876543210'],
    ['a country code', '+919876543210'],
    ['no domain', 'owner@'],
  ])('refuses an identifier that is %s, naming the rule', (_label, identifier) => {
    const result = LoginSchema.safeParse({ identifier, password: PASSWORD });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['identifier'], message: 'auth.login.errors.identifier' }),
    ]);
  });

  it('refuses a password shorter than 8 characters and accepts one of exactly 8', () => {
    const short = LoginSchema.safeParse({ identifier: '9876543210', password: '1234567' });
    expect(short.error?.issues).toEqual([
      expect.objectContaining({ path: ['password'], message: 'auth.login.errors.password' }),
    ]);
    expect(LoginSchema.safeParse({ identifier: '9876543210', password: '12345678' }).success).toBe(
      true,
    );
  });
});
