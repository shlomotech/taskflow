import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { Config } from "../config.js";
import type { AuthUser } from "../services/auth.service.js";
import { AppError } from "./errors.js";

const refreshPayloadSchema = z.object({
  email: z.string().email(),
  exp: z.number().int().positive(),
  iat: z.number().int().positive().optional(),
  jti: z.string().uuid(),
  sub: z.string().min(1),
  type: z.literal("refresh"),
});

export interface AuthTokenSubject extends Pick<AuthUser, "email" | "id"> {}

interface RefreshJwtDecorator {
  refresh: {
    sign: FastifyInstance["jwt"]["sign"];
    verify: FastifyInstance["jwt"]["verify"];
  };
}

export async function createAccessToken(
  server: FastifyInstance,
  config: Config,
  user: AuthTokenSubject,
) {
  return server.jwt.sign(
    {
      email: user.email,
      sub: user.id,
      type: "access",
    },
    {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    },
  );
}

export async function createRefreshToken(
  server: FastifyInstance,
  config: Config,
  user: AuthTokenSubject,
) {
  const refreshJwt = server.jwt as FastifyInstance["jwt"] & RefreshJwtDecorator;
  const token = await refreshJwt.refresh.sign(
    {
      email: user.email,
      jti: randomUUID(),
      sub: user.id,
      type: "refresh",
    },
    {
      expiresIn: config.JWT_REFRESH_EXPIRY,
    },
  );

  const payload = refreshPayloadSchema.parse(
    await refreshJwt.refresh.verify(token),
  );

  return {
    expiresAt: new Date(payload.exp * 1000),
    token,
  };
}

export async function verifyRefreshToken(server: FastifyInstance, token: string) {
  const refreshJwt = server.jwt as FastifyInstance["jwt"] & RefreshJwtDecorator;

  try {
    return refreshPayloadSchema.parse(await refreshJwt.refresh.verify(token));
  } catch (error) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token", {
      cause: error,
    });
  }
}

export function setRefreshTokenCookie(
  reply: FastifyReply,
  config: Config,
  token: string,
  expiresAt: Date,
) {
  reply.setCookie(config.REFRESH_TOKEN_COOKIE_NAME, token, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: true,
  });
}

export function clearRefreshTokenCookie(reply: FastifyReply, config: Config) {
  reply.clearCookie(config.REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: true,
  });
}
