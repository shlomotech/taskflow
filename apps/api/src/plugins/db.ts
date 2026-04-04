import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { createDb, type Database } from '../db/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

export const dbPlugin = fp(
  async (app) => {
    if (!app.config.DATABASE_URL) {
      app.log.warn('DATABASE_URL not set; DB unavailable.');
      return;
    }
    const db = createDb(
      app.config.DATABASE_URL,
      app.config.NODE_ENV === 'production' ? 10 : 5,
    );
    app.decorate('db', db);
  } satisfies FastifyPluginAsync,
  { name: 'db' },
);
