import type { FastifyPluginAsync } from 'fastify';
import { authRoutes } from './auth.js';
import { commentsRoutes } from './comments.js';
import { githubLinksRoutes } from './github-links.js';
import { labelsRoutes } from './labels.js';
import { projectsRoutes } from './projects.js';
import { tasksRoutes } from './tasks.js';
import { usersRoutes } from './users.js';

export const routesPlugin: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/health', async () => ({ data: { status: 'ok' } }));

  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(projectsRoutes, { prefix: '/api/v1' });
  await app.register(tasksRoutes, { prefix: '/api/v1' });
  await app.register(labelsRoutes, { prefix: '/api/v1' });
  await app.register(usersRoutes, { prefix: '/api/v1' });
  await app.register(commentsRoutes, { prefix: '/api/v1' });
  await app.register(githubLinksRoutes, { prefix: '/api/v1' });
};
