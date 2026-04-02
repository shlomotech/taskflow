import Fastify, { type FastifyServerOptions } from "fastify";
import authenticatePlugin from "./plugins/authenticate.js";
import corsPlugin from "./plugins/cors.js";
import dbPlugin from "./plugins/db.js";
import helmetPlugin from "./plugins/helmet.js";
import jwtPlugin from "./plugins/jwt.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import sensiblePlugin from "./plugins/sensible.js";

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: true,
    ...options,
  });

  app.register(helmetPlugin);
  app.register(corsPlugin);
  app.register(sensiblePlugin);
  app.register(jwtPlugin);
  app.register(rateLimitPlugin);
  app.register(dbPlugin);
  app.register(authenticatePlugin);

  app.get("/health", async () => ({
    status: "ok",
  }));

  return app;
}
