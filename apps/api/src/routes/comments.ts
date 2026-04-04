import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '../services/comments.service.js';

const createBody = z.object({ body: z.string().min(1) });
const updateBody = z.object({ body: z.string().min(1) });

export const commentsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId/comments',
    async (request) => {
      const comments = await listComments(app.db, request.params.taskId);
      return { data: comments };
    },
  );

  app.post<{ Params: { projectId: string; taskId: string } }>(
    '/projects/:projectId/tasks/:taskId/comments',
    async (request, reply) => {
      const body = createBody.parse(request.body);
      const comment = await createComment(
        app.db,
        request.params.taskId,
        request.user.sub,
        body,
      );
      app.io.to(`board:${request.params.projectId}`).emit('comment:created', comment);
      return reply.status(201).send({ data: comment });
    },
  );

  app.patch<{ Params: { projectId: string; taskId: string; commentId: string } }>(
    '/projects/:projectId/tasks/:taskId/comments/:commentId',
    async (request) => {
      const body = updateBody.parse(request.body);
      const comment = await updateComment(
        app.db,
        request.params.commentId,
        request.user.sub,
        body,
      );
      return { data: comment };
    },
  );

  app.delete<{ Params: { projectId: string; taskId: string; commentId: string } }>(
    '/projects/:projectId/tasks/:taskId/comments/:commentId',
    async (request, reply) => {
      await deleteComment(app.db, request.params.commentId, request.user.sub);
      return reply.status(204).send();
    },
  );
};
