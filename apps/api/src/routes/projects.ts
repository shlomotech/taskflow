import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../services/projects.service.js';

const createBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const updateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/projects', async (request) => {
    const projects = await listProjects(app.db, request.user.sub);
    return { data: projects };
  });

  app.post('/projects', async (request, reply) => {
    const body = createBody.parse(request.body);
    const project = await createProject(app.db, request.user.sub, body);
    return reply.status(201).send({ data: project });
  });

  app.get<{ Params: { projectId: string } }>('/projects/:projectId', async (request) => {
    const project = await getProject(app.db, request.params.projectId);
    return { data: project };
  });

  app.patch<{ Params: { projectId: string } }>('/projects/:projectId', async (request) => {
    const body = updateBody.parse(request.body);
    const project = await updateProject(app.db, request.params.projectId, request.user.sub, body);
    return { data: project };
  });

  app.delete<{ Params: { projectId: string } }>('/projects/:projectId', async (request, reply) => {
    await deleteProject(app.db, request.params.projectId, request.user.sub);
    return reply.status(204).send();
  });
};
