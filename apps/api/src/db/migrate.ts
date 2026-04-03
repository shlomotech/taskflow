import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { db, sql } from './index.js';

function resolveMigrationsFolder() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDir, './migrations'),
    resolve(currentDir, '../../src/db/migrations'),
    resolve(process.cwd(), 'src/db/migrations'),
    resolve(process.cwd(), 'apps/api/src/db/migrations'),
  ];

  const folder = candidates.find((candidate) => existsSync(candidate));

  if (!folder) {
    throw new Error('Unable to locate the Drizzle migrations folder');
  }

  return folder;
}

export async function runMigrations() {
  await migrate(db, {
    migrationsFolder: resolveMigrationsFolder(),
  });
}

async function main() {
  try {
    await runMigrations();
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void main();
}
