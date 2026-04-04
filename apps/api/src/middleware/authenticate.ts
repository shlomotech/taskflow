import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface JwtUser {
  sub: string;
  email: string;
  name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    ) as JwtUser;
    request.user = payload;
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}
