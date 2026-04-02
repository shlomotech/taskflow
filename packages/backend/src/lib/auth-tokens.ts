import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppEnv } from "../config/env.js";
import { AppError } from "./errors.js";
import type { AuthUser } from "../services/auth-service.js";

const authTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  type: z.enum(["access", "refresh"]),
});

export type AuthTokenPayload = z.infer<typeof authTokenPayloadSchema>;

export async function createAccessToken(
  server: FastifyInstance,
  env: AppEnv,
  user: AuthUser,
) {
  return server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: "access",
    },
    {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
  );
}

export async function createAuthTokens(
  server: FastifyInstance,
  env: AppEnv,
  user: AuthUser,
) {
  const accessToken = await createAccessToken(server, env, user);
  const refreshToken = await server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: "refresh",
    },
    {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    },
  );

  return {
    accessToken,
    refreshToken,
  };
}

export async function verifyRefreshToken(
  server: FastifyInstance,
  refreshToken: string,
) {
  try {
    const decoded = await server.jwt.verify(refreshToken);
    const payload = authTokenPayloadSchema.parse(decoded);

    if (payload.type !== "refresh") {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }
}
