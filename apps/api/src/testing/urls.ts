// Connection URLs the integration setup provides. The app under test connects
// as app; superuser is only for seeding and inspecting, because it bypasses
// RLS and a check made as it proves nothing.
export interface DatabaseUrls {
  superuser: string;
  owner: string;
  app: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrls: DatabaseUrls;
  }
}
