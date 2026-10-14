// drizzle-kit generates SQL from src/schema; RLS, grants and resolvers are appended
// by hand to the end of the migration that creates each table (TRD §5.2).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
});
