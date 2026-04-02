import type { FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";

export async function authenticate(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch (error) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required", {
      cause: error,
    });
  }
}

export function getAuthenticatedUserId(request: FastifyRequest) {
  const user = request.user;

  if (!user || typeof user !== "object" || !("id" in user)) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { id } = user;

  if (typeof id !== "string" || id.length === 0) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  return id;
}
