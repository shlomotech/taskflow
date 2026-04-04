import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const publicFields = {
  id: schema.users.id,
  email: schema.users.email,
  name: schema.users.name,
  createdAt: schema.users.createdAt,
};

const updateBody = z.object({
  name: z.string().min(1).max(100).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get('/api/v1/users', async () => {
    const users = await db.select(publicFields).from(schema.users);
    return { data: users };
  });

  app.get<{ Params: { id: string } }>('/api/v1/users/:id', async (request, reply) => {
    const [user] = await db
      .select(publicFields)
      .from(schema.users)
      .where(eq(schema.users.id, request.params.id))
      .limit(1);
    if (!user) return reply.status(404).send({ error: 'User not found.' });
    return { data: user };
  });

  app.patch<{ Params: { id: string } }>('/api/v1/users/:id', async (request, reply) => {
    if (request.params.id !== request.user.sub) {
      return reply.status(403).send({ error: 'You can only update your own profile.' });
    }
    let body: z.infer<typeof updateBody>;
    try {
      body = updateBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }
    const [user] = await db
      .update(schema.users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.users.id, request.params.id))
      .returning(publicFields);
    if (!user) return reply.status(404).send({ error: 'User not found.' });
    return { data: user };
  });
}
