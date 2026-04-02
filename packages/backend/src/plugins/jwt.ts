import fastifyJwt, { type FastifyJwtNamespace } from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

export interface AuthTokenPayload {
  email: string;
  sub: string;
}

export interface AuthenticatedUser {
  email: string;
  id: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthenticatedUser;
  }
}

declare module "fastify" {
  interface FastifyInstance
    extends FastifyJwtNamespace<{ namespace: "refresh" }> {}
}

function getJwtSecrets() {
  const accessSecret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET;

  if (!accessSecret) {
    throw new Error(
      "JWT_ACCESS_SECRET or JWT_SECRET environment variable is required",
    );
  }

  if (!refreshSecret) {
    throw new Error(
      "JWT_REFRESH_SECRET or JWT_SECRET environment variable is required",
    );
  }

  return { accessSecret, refreshSecret };
}

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  const { accessSecret, refreshSecret } = getJwtSecrets();

  await fastify.register(fastifyJwt, {
    formatUser: (payload) => ({
      email: payload.email,
      id: payload.sub,
    }),
    secret: accessSecret,
    sign: {
      expiresIn: process.env.JWT_ACCESS_EXPIRY ?? "15m",
    },
  });

  await fastify.register(fastifyJwt, {
    namespace: "refresh",
    secret: refreshSecret,
    sign: {
      expiresIn: process.env.JWT_REFRESH_EXPIRY ?? "7d",
    },
  });
};

export default fp(jwtPlugin, {
  name: "jwt",
});
