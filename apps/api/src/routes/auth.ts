import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { loginUser, registerUser } from '../services/auth.service.js';

const registerBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', async (request, reply) => {
    const body = registerBody.parse(request.body);
    const user = await registerUser(app.db, body);
    const payload = { sub: user.id, email: user.email, name: user.name };
    const tokens = {
      accessToken: app.signAccessToken(payload),
      refreshToken: app.signRefreshToken(payload),
    };
    return reply.status(201).send({ data: { user, tokens } });
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginBody.parse(request.body);
    const user = await loginUser(app.db, body);
    const payload = { sub: user.id, email: user.email, name: user.name };
    const tokens = {
      accessToken: app.signAccessToken(payload),
      refreshToken: app.signRefreshToken(payload),
    };
    return reply.send({ data: { user, tokens } });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = refreshBody.parse(request.body);
    const payload = await app.verifyRefreshToken(refreshToken);
    const accessToken = app.signAccessToken({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    });
    return reply.send({ data: { accessToken } });
  });

  app.get('/auth/me', { preHandler: authenticate }, async (request) => {
    return { data: { user: request.user } };
  });
};
