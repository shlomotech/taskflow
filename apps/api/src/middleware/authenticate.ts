import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  await request.jwtVerify();
}
