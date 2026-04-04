import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import {
  createLabel,
  deleteLabel,
  listLabels,
  updateLabel,
} from '../services/labels.service.js';

const createBody = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const updateBody = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const labelsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/labels',
    async (request) => {
      const labels = await listLabels(app.db, request.params.projectId);
      return { data: labels };
    },
  );

  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/labels',
    async (request, reply) => {
      const body = createBody.parse(request.body);
      const label = await createLabel(app.db, request.params.projectId, body);
      return reply.status(201).send({ data: label });
    },
  );

  app.patch<{ Params: { projectId: string; labelId: string } }>(
    '/projects/:projectId/labels/:labelId',
    async (request) => {
      const body = updateBody.parse(request.body);
      const label = await updateLabel(
        app.db,
        request.params.labelId,
        request.params.projectId,
        body,
      );
      return { data: label };
    },
  );

  app.delete<{ Params: { projectId: string; labelId: string } }>(
    '/projects/:projectId/labels/:labelId',
    async (request, reply) => {
      await deleteLabel(app.db, request.params.labelId, request.params.projectId);
      return reply.status(204).send();
    },
  );
};
