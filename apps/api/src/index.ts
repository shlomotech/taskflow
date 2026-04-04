import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth.js';
import { boardRoutes } from './routes/boards.js';
import { issueRoutes } from './routes/issues.js';
import { labelRoutes } from './routes/labels.js';
import { userRoutes } from './routes/users.js';
import { commentRoutes } from './routes/comments.js';
import { githubLinkRoutes } from './routes/github-links.js';
import { createSocketServer } from './socket.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
});

// Socket.io — attach to the underlying http server (available at construction time)
const io = createSocketServer(app.server);

// Auth (public routes — no auth middleware)
await app.register(authRoutes);

// Protected resource routes
await app.register(boardRoutes);
await app.register(labelRoutes);
await app.register(userRoutes);
await app.register(issueRoutes(io));
await app.register(commentRoutes(io));
await app.register(githubLinkRoutes);

app.get('/api/health', async () => ({ status: 'ok' }));
app.get('/api/v1/health', async () => ({ status: 'ok' }));

const port = parseInt(process.env.API_PORT ?? '3001', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`TaskFlow API running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
