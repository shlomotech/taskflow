import Fastify from 'fastify';

import { runMigrations } from './db/migrate.js';

const app = Fastify({ logger: true });

app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    const port = Number(process.env['PORT'] ?? 4000);
    await runMigrations();
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
