import fastifyJwt from "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";
import type { AuthenticatedUser } from "../types/auth.js";

export const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: app.config.JWT_ACCESS_SECRET,
    sign: {
      expiresIn: app.config.JWT_ACCESS_EXPIRY,
    },
  });

  app.decorate("signAccessToken", (user: AuthenticatedUser) => app.jwt.sign(user));
  app.decorate("signRefreshToken", (user: AuthenticatedUser) =>
    app.jwt.sign(user, {
      expiresIn: app.config.JWT_REFRESH_EXPIRY,
      key: app.config.JWT_REFRESH_SECRET,
    })
  );
  app.decorate("verifyRefreshToken", async (token: string) =>
    app.jwt.verify<AuthenticatedUser>(token, {
      key: app.config.JWT_REFRESH_SECRET,
    })
  );
};
