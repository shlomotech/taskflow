import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../services/errors.js';
import { getUser, listUsers, updateUser } from '../services/users.service.js';

const updateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/users', async () => {
    const users = await listUsers(app.db);
    return { data: users };
  });

  app.get<{ Params: { userId: string } }>('/users/:userId', async (request) => {
    const user = await getUser(app.db, request.params.userId);
    return { data: user };
  });

  app.patch<{ Params: { userId: string } }>('/users/:userId', async (request) => {
    if (request.params.userId !== request.user.sub) {
      throw new AppError('FORBIDDEN', 403, 'You can only update your own profile.');
    }
    const body = updateBody.parse(request.body);
    const user = await updateUser(app.db, request.params.userId, body);
    return { data: user };
  });
};
