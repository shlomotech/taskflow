import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { createGithubLink, listGithubLinks } from '../services/github-links.service.js';

const createBody = z.object({
  prUrl: z.string().url(),
  prNumber: z.string().optional(),
  repo: z.string().optional(),
});

export const githubLinksRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId/github-links',
    async (request) => {
      const links = await listGithubLinks(app.db, request.params.taskId);
      return { data: links };
    },
  );

  app.post<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId/github-links',
    async (request, reply) => {
      const body = createBody.parse(request.body);
      const link = await createGithubLink(app.db, request.params.taskId, body);
      return reply.status(201).send({ data: link });
    },
  );
};
