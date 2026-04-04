import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { Server as SocketServer } from 'socket.io';
import { db, schema } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const createBody = z.object({ body: z.string().min(1) });
const updateBody = z.object({ body: z.string().min(1) });

export function commentRoutes(io: SocketServer) {
  return async (app: FastifyInstance) => {
    app.addHook('onRequest', authenticate);

    app.get<{ Params: { issueId: string } }>(
      '/api/v1/issues/:issueId/comments',
      async (request) => {
        const comments = await db
          .select()
          .from(schema.comments)
          .where(eq(schema.comments.issueId, request.params.issueId));
        return { data: comments };
      },
    );

    app.post<{ Params: { issueId: string } }>(
      '/api/v1/issues/:issueId/comments',
      async (request, reply) => {
        let body: z.infer<typeof createBody>;
        try {
          body = createBody.parse(request.body);
        } catch (e: any) {
          return reply.status(400).send({ error: 'Validation error', details: e.issues });
        }
        const now = new Date();
        const [comment] = await db
          .insert(schema.comments)
          .values({
            id: nanoid(),
            body: body.body,
            issueId: request.params.issueId,
            authorId: request.user.sub,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        // look up boardId to emit to the right room
        const [issue] = await db
          .select({ boardId: schema.issues.boardId })
          .from(schema.issues)
          .where(eq(schema.issues.id, request.params.issueId))
          .limit(1);
        if (issue) io.to(`board:${issue.boardId}`).emit('comment:created', comment);
        return reply.status(201).send({ data: comment });
      },
    );

    app.patch<{ Params: { issueId: string; commentId: string } }>(
      '/api/v1/issues/:issueId/comments/:commentId',
      async (request, reply) => {
        let body: z.infer<typeof updateBody>;
        try {
          body = updateBody.parse(request.body);
        } catch (e: any) {
          return reply.status(400).send({ error: 'Validation error', details: e.issues });
        }
        const [comment] = await db
          .update(schema.comments)
          .set({ body: body.body, updatedAt: new Date() })
          .where(
            and(
              eq(schema.comments.id, request.params.commentId),
              eq(schema.comments.authorId, request.user.sub),
            ),
          )
          .returning();
        if (!comment) return reply.status(404).send({ error: 'Comment not found.' });
        return { data: comment };
      },
    );

    app.delete<{ Params: { issueId: string; commentId: string } }>(
      '/api/v1/issues/:issueId/comments/:commentId',
      async (request, reply) => {
        const [comment] = await db
          .delete(schema.comments)
          .where(
            and(
              eq(schema.comments.id, request.params.commentId),
              eq(schema.comments.authorId, request.user.sub),
            ),
          )
          .returning({ id: schema.comments.id });
        if (!comment) return reply.status(404).send({ error: 'Comment not found.' });
        return reply.status(204).send();
      },
    );
  };
}
