import type { FastifyInstance } from 'fastify';
import { and, eq, SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { Server as SocketServer } from 'socket.io';
import { db, schema } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const createBody = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  boardId: z.string().min(1),
  assigneeId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

const updateBody = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
});

const assignBody = z.object({ userId: z.string().min(1) });

export function issueRoutes(io: SocketServer) {
  return async (app: FastifyInstance) => {
    app.addHook('onRequest', authenticate);

    // List issues with optional filters
    app.get<{
      Querystring: { boardId?: string; status?: string; priority?: string; assigneeId?: string };
    }>('/api/v1/issues', async (request) => {
      const { boardId, status, priority, assigneeId } = request.query;
      const conditions: SQL[] = [];
      if (boardId) conditions.push(eq(schema.issues.boardId, boardId));
      if (status) conditions.push(eq(schema.issues.status, status as any));
      if (priority) conditions.push(eq(schema.issues.priority, priority as any));
      if (assigneeId) conditions.push(eq(schema.issues.assigneeId, assigneeId));
      const issues = await db
        .select()
        .from(schema.issues)
        .where(conditions.length ? and(...conditions) : undefined);
      return { data: issues };
    });

    // Create issue
    app.post('/api/v1/issues', async (request, reply) => {
      let body: z.infer<typeof createBody>;
      try {
        body = createBody.parse(request.body);
      } catch (e: any) {
        return reply.status(400).send({ error: 'Validation error', details: e.issues });
      }
      const now = new Date();
      const [issue] = await db
        .insert(schema.issues)
        .values({
          id: nanoid(),
          title: body.title,
          description: body.description,
          status: body.status ?? 'todo',
          priority: body.priority ?? 'medium',
          boardId: body.boardId,
          assigneeId: body.assigneeId,
          labelIds: body.labelIds ?? [],
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      io.to(`board:${issue.boardId}`).emit('issue:created', issue);
      return reply.status(201).send({ data: issue });
    });

    // Get issue
    app.get<{ Params: { id: string } }>('/api/v1/issues/:id', async (request, reply) => {
      const [issue] = await db
        .select()
        .from(schema.issues)
        .where(eq(schema.issues.id, request.params.id))
        .limit(1);
      if (!issue) return reply.status(404).send({ error: 'Issue not found.' });
      return { data: issue };
    });

    // Update issue
    app.patch<{ Params: { id: string } }>('/api/v1/issues/:id', async (request, reply) => {
      let body: z.infer<typeof updateBody>;
      try {
        body = updateBody.parse(request.body);
      } catch (e: any) {
        return reply.status(400).send({ error: 'Validation error', details: e.issues });
      }
      const [issue] = await db
        .update(schema.issues)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(schema.issues.id, request.params.id))
        .returning();
      if (!issue) return reply.status(404).send({ error: 'Issue not found.' });
      io.to(`board:${issue.boardId}`).emit('issue:updated', issue);
      return { data: issue };
    });

    // Delete issue
    app.delete<{ Params: { id: string } }>('/api/v1/issues/:id', async (request, reply) => {
      const [issue] = await db
        .delete(schema.issues)
        .where(eq(schema.issues.id, request.params.id))
        .returning();
      if (!issue) return reply.status(404).send({ error: 'Issue not found.' });
      io.to(`board:${issue.boardId}`).emit('issue:deleted', { id: issue.id });
      return reply.status(204).send();
    });

    // Assign issue
    app.post<{ Params: { id: string } }>(
      '/api/v1/issues/:id/assignments',
      async (request, reply) => {
        let body: z.infer<typeof assignBody>;
        try {
          body = assignBody.parse(request.body);
        } catch (e: any) {
          return reply.status(400).send({ error: 'Validation error', details: e.issues });
        }
        const [issue] = await db
          .update(schema.issues)
          .set({ assigneeId: body.userId, updatedAt: new Date() })
          .where(eq(schema.issues.id, request.params.id))
          .returning();
        if (!issue) return reply.status(404).send({ error: 'Issue not found.' });
        await db.insert(schema.assignments).values({
          id: nanoid(),
          issueId: request.params.id,
          userId: body.userId,
          assignedAt: new Date(),
        });
        io.to(`board:${issue.boardId}`).emit('issue:updated', issue);
        return { data: issue };
      },
    );

    // Unassign issue
    app.delete<{ Params: { id: string } }>(
      '/api/v1/issues/:id/assignments',
      async (request, reply) => {
        const [issue] = await db
          .update(schema.issues)
          .set({ assigneeId: null, updatedAt: new Date() })
          .where(eq(schema.issues.id, request.params.id))
          .returning();
        if (!issue) return reply.status(404).send({ error: 'Issue not found.' });
        await db
          .delete(schema.assignments)
          .where(eq(schema.assignments.issueId, request.params.id));
        io.to(`board:${issue.boardId}`).emit('issue:updated', issue);
        return { data: issue };
      },
    );
  };
}
