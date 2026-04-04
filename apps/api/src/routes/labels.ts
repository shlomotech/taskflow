import type { FastifyInstance } from 'fastify';
import { eq, SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const createBody = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  boardId: z.string().min(1),
});

const updateBody = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function labelRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get<{ Querystring: { boardId?: string } }>('/api/v1/labels', async (request) => {
    const { boardId } = request.query;
    const conditions: SQL[] = [];
    if (boardId) conditions.push(eq(schema.labels.boardId, boardId));
    const labels = await db
      .select()
      .from(schema.labels)
      .where(conditions.length ? conditions[0] : undefined);
    return { data: labels };
  });

  app.post('/api/v1/labels', async (request, reply) => {
    let body: z.infer<typeof createBody>;
    try {
      body = createBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }
    const [label] = await db
      .insert(schema.labels)
      .values({ id: nanoid(), name: body.name, color: body.color, boardId: body.boardId })
      .returning();
    return reply.status(201).send({ data: label });
  });

  app.patch<{ Params: { id: string } }>('/api/v1/labels/:id', async (request, reply) => {
    let body: z.infer<typeof updateBody>;
    try {
      body = updateBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }
    const [label] = await db
      .update(schema.labels)
      .set(body)
      .where(eq(schema.labels.id, request.params.id))
      .returning();
    if (!label) return reply.status(404).send({ error: 'Label not found.' });
    return { data: label };
  });

  app.delete<{ Params: { id: string } }>('/api/v1/labels/:id', async (request, reply) => {
    const [label] = await db
      .delete(schema.labels)
      .where(eq(schema.labels.id, request.params.id))
      .returning({ id: schema.labels.id });
    if (!label) return reply.status(404).send({ error: 'Label not found.' });
    return reply.status(204).send();
  });
}
