import { describe, expect, it } from 'vitest';

import type { Db } from './client.js';
import { withTenant } from './with-tenant.js';

// A handle that fails the test if withTenant ever reaches the database.
const unreachable = {
  transaction: () => {
    throw new Error('opened a transaction');
  },
} as unknown as Db;

const TENANT = '0192a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b';

describe('withTenant', () => {
  it('refuses a tenant id that is not a UUID before opening a transaction', async () => {
    await expect(
      withTenant(unreachable, { tenantId: 'tenant-a', outletIds: [] }, () => Promise.resolve()),
    ).rejects.toThrow('tenantId must be a UUID');
  });

  it('refuses an outlet id that could smuggle a second id into the list', async () => {
    await expect(
      withTenant(unreachable, { tenantId: TENANT, outletIds: [`${TENANT},${TENANT}`] }, () =>
        Promise.resolve(),
      ),
    ).rejects.toThrow('outletIds must be a UUID');
  });
});
