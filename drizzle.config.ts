import 'tsx/cjs';

import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env['DATABASE_URL'] ??
  'postgresql://taskflow:taskflow@localhost:5432/taskflow';

export default defineConfig({
  schema: './apps/api/src/db/schema/*.ts',
  out: './apps/api/src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
