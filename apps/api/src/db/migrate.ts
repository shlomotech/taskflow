import type { FastifyInstance } from 'fastify';

export async function migrate(app: FastifyInstance): Promise<void> {
  if (!app.config.DATABASE_URL) {
    app.log.warn('DATABASE_URL not set — skipping migrations.');
    return;
  }
  try {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate: drizzleMigrate } = await import('drizzle-orm/postgres-js/migrator');
    const postgres = (await import('postgres')).default;
    const sql = postgres(app.config.DATABASE_URL, { max: 1 });
    const db = drizzle(sql);
    await drizzleMigrate(db, { migrationsFolder: './src/db/migrations' });
    await sql.end();
    app.log.info('Database migrations complete.');
  } catch (err) {
    app.log.warn({ err }, 'Migration failed — continuing without it.');
  }
}
