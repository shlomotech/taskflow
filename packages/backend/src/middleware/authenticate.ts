import type { FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";

export async function authenticate(request: FastifyRequest) {
  await request.jwtVerify();

  if (request.user.type !== "access") {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid access token");
  }
}
