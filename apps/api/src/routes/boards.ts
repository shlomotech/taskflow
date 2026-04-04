import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const createBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const updateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function boardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get('/api/v1/boards', async () => {
    const boards = await db.select().from(schema.boards);
    return { data: boards };
  });

  app.post('/api/v1/boards', async (request, reply) => {
    let body: z.infer<typeof createBody>;
    try {
      body = createBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }
    const now = new Date();
    const [board] = await db
      .insert(schema.boards)
      .values({
        id: nanoid(),
        name: body.name,
        description: body.description,
        ownerId: request.user.sub,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return reply.status(201).send({ data: board });
  });

  app.get<{ Params: { id: string } }>('/api/v1/boards/:id', async (request, reply) => {
    const [board] = await db
      .select()
      .from(schema.boards)
      .where(eq(schema.boards.id, request.params.id))
      .limit(1);
    if (!board) return reply.status(404).send({ error: 'Board not found.' });
    return { data: board };
  });

  app.patch<{ Params: { id: string } }>('/api/v1/boards/:id', async (request, reply) => {
    let body: z.infer<typeof updateBody>;
    try {
      body = updateBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }
    const [board] = await db
      .update(schema.boards)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(eq(schema.boards.id, request.params.id), eq(schema.boards.ownerId, request.user.sub)),
      )
      .returning();
    if (!board) return reply.status(404).send({ error: 'Board not found.' });
    return { data: board };
  });

  app.delete<{ Params: { id: string } }>('/api/v1/boards/:id', async (request, reply) => {
    const [board] = await db
      .delete(schema.boards)
      .where(
        and(eq(schema.boards.id, request.params.id), eq(schema.boards.ownerId, request.user.sub)),
      )
      .returning({ id: schema.boards.id });
    if (!board) return reply.status(404).send({ error: 'Board not found.' });
    return reply.status(204).send();
  });
}
