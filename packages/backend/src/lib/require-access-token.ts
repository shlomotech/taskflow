import type { FastifyRequest } from "fastify";
import { AppError } from "./errors.js";

export async function requireAccessToken(request: FastifyRequest) {
  await request.jwtVerify();

  if (request.user.type !== "access") {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid access token");
  }
}
