// Starts Postgres the way infra does: same image, same roles script, then the
// API's own migrate step as bhojnalya_owner. Tests get one URL per role.
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

import { migrate } from '../platform/db/migrate.js';
import type { DatabaseUrls } from './urls.js';

// Keep in step with infra/docker-compose.yml.
const IMAGE = 'postgres:16.10-alpine';
const ROLES_SCRIPT = fileURLToPath(
  new URL('../../../../infra/postgres/init/01-roles.sh', import.meta.url),
);
const DB_NAME = 'bhojnalya';
const PASSWORDS = {
  superuser: 'test-superuser',
  owner: 'test-owner',
  app: 'test-app',
  platformAdmin: 'test-platform-admin',
};

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const container = await new PostgreSqlContainer(IMAGE)
    .withUsername('postgres')
    .withPassword(PASSWORDS.superuser)
    .withDatabase('postgres')
    .withEnvironment({
      DB_NAME,
      DB_OWNER_PASSWORD: PASSWORDS.owner,
      APP_USER_PASSWORD: PASSWORDS.app,
      PLATFORM_ADMIN_PASSWORD: PASSWORDS.platformAdmin,
    })
    .withCopyFilesToContainer([
      { source: ROLES_SCRIPT, target: '/docker-entrypoint-initdb.d/01-roles.sh', mode: 0o755 },
    ])
    .start();

  const url = (user: string, password: string): string =>
    `postgres://${user}:${password}@${container.getHost()}:${String(container.getPort())}/${DB_NAME}`;

  const urls: DatabaseUrls = {
    superuser: url('postgres', PASSWORDS.superuser),
    owner: url('bhojnalya_owner', PASSWORDS.owner),
    app: url('app_user', PASSWORDS.app),
  };

  await migrate(urls.owner);
  project.provide('databaseUrls', urls);

  return async () => {
    await container.stop();
  };
}
