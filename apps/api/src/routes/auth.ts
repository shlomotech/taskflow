import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/index.js';

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

function signTokens(userId: string, email: string, name: string) {
  const payload = { sub: userId, email, name };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret', {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret', {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY ?? '7d') as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/v1/auth/register', async (request, reply) => {
    let body: z.infer<typeof registerBody>;
    try {
      body = registerBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }

    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, body.email))
      .limit(1);
    if (existing) return reply.status(409).send({ error: 'Email already in use.' });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const now = new Date();
    const [user] = await db
      .insert(schema.users)
      .values({ id: nanoid(), email: body.email, name: body.name, passwordHash, createdAt: now, updatedAt: now })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        createdAt: schema.users.createdAt,
      });

    const tokens = signTokens(user.id, user.email, user.name);
    return reply.status(201).send({ data: { user, tokens } });
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    let body: z.infer<typeof loginBody>;
    try {
      body = loginBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, body.email))
      .limit(1);

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid email or password.' });
    }

    const tokens = signTokens(user.id, user.email, user.name);
    return reply.send({
      data: {
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
        tokens,
      },
    });
  });

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    let body: z.infer<typeof refreshBody>;
    try {
      body = refreshBody.parse(request.body);
    } catch (e: any) {
      return reply.status(400).send({ error: 'Validation error', details: e.issues });
    }

    try {
      const payload = jwt.verify(
        body.refreshToken,
        process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      ) as { sub: string; email: string; name: string };
      const accessToken = jwt.sign(
        { sub: payload.sub, email: payload.email, name: payload.name },
        process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        { expiresIn: (process.env.JWT_ACCESS_EXPIRY ?? '15m') as jwt.SignOptions['expiresIn'] },
      );
      return reply.send({ data: { accessToken } });
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired refresh token.' });
    }
  });
}
