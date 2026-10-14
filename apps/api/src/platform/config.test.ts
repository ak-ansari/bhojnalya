import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('connects with a pool of 10 on port 3000 unless told otherwise', () => {
    const config = loadConfig({ DATABASE_URL: 'postgres://app_user:pw@db:5432/bhojnalya' });

    expect(config).toMatchObject({ PORT: 3000, DB_POOL_SIZE: 10, LOG_LEVEL: 'info' });
  });

  it('refuses to start without a Postgres DATABASE_URL, naming the variable', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ DATABASE_URL: 'mysql://x@y/z' })).toThrow(/DATABASE_URL/);
  });

  it('runs its tests in UTC whatever the machine timezone is', () => {
    expect(new Date(0).getTimezoneOffset()).toBe(0);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });
});
