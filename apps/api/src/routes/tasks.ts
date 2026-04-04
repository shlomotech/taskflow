import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import {
  assignTask,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  unassignTask,
  updateTask,
} from '../services/tasks.service.js';

const createBody = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
});

const updateBody = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  position: z.number().optional(),
});

const assignBody = z.object({
  userId: z.string().uuid(),
});

export const tasksRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get<{
    Params: { projectId: string };
    Querystring: { status?: string; priority?: string; assigneeId?: string };
  }>('/projects/:projectId/tasks', async (request) => {
    const tasks = await listTasks(app.db, request.params.projectId, request.query);
    return { data: tasks };
  });

  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/tasks',
    async (request, reply) => {
      const body = createBody.parse(request.body);
      const task = await createTask(app.db, request.params.projectId, request.user.sub, body);
      app.io.to(`board:${request.params.projectId}`).emit('issue:created', task);
      return reply.status(201).send({ data: task });
    },
  );

  app.get<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId',
    async (request) => {
      const task = await getTask(app.db, request.params.taskId);
      return { data: task };
    },
  );

  app.patch<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId',
    async (request) => {
      const body = updateBody.parse(request.body);
      const task = await updateTask(app.db, request.params.taskId, body);
      app.io.to(`board:${request.params.projectId}`).emit('issue:updated', task);
      return { data: task };
    },
  );

  app.delete<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId',
    async (request, reply) => {
      await deleteTask(app.db, request.params.taskId);
      app.io
        .to(`board:${request.params.projectId}`)
        .emit('issue:deleted', { id: request.params.taskId });
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId/assignments',
    async (request) => {
      const { userId } = assignBody.parse(request.body);
      const task = await assignTask(app.db, request.params.taskId, userId);
      app.io.to(`board:${request.params.projectId}`).emit('issue:updated', task);
      return { data: task };
    },
  );

  app.delete<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId/assignments',
    async (request) => {
      const task = await unassignTask(app.db, request.params.taskId);
      app.io.to(`board:${request.params.projectId}`).emit('issue:updated', task);
      return { data: task };
    },
  );
};
