import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { config } from '../config.js';
import * as schema from './schema/index.js';

export const sql = postgres(config.DATABASE_URL, {
  max: config.NODE_ENV === 'production' ? 10 : 1,
});

export const db = drizzle(sql, { schema });

export type Database = typeof db;
export { schema };
