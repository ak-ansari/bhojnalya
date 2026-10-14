// Connection URLs the integration setup provides, one per role. Assertions
// run as app (or platformAdmin); superuser is only for seeding fixtures,
// because it bypasses RLS and a test run as it checks nothing.
export interface DatabaseUrls {
  superuser: string;
  owner: string;
  app: string;
  platformAdmin: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrls: DatabaseUrls;
  }
}
