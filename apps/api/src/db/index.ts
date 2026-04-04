import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(databaseUrl: string, maxConnections = 5): Database {
  const sql = postgres(databaseUrl, { max: maxConnections });
  return drizzle(sql, { schema });
}

export { schema };
