import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyServerOptions } from "fastify";
import { createConfig, type Config } from "./config.js";
import { createDatabasePool } from "./lib/db.js";
import { registerErrorHandler } from "./lib/errors.js";
import authRoutes from "./routes/auth/index.js";
import {
  PostgresAuthService,
  type AuthService,
} from "./services/auth.service.js";

export interface BuildAppOptions {
  authService?: AuthService;
  config?: Config;
  fastify?: FastifyServerOptions;
}

export function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? createConfig();
  const app = Fastify({
    logger: config.NODE_ENV !== "test",
    ...options.fastify,
  });

  const pool = options.authService ? null : createDatabasePool(config.DATABASE_URL);
  const authService =
    options.authService ?? new PostgresAuthService(pool!);

  app.register(cookie);
  app.register(cors, {
    credentials: true,
    origin: config.CORS_ORIGIN ?? true,
  });

  app.register(jwt, {
    secret: config.JWT_ACCESS_SECRET,
  });

  app.register(jwt, {
    namespace: "refresh",
    secret: config.JWT_REFRESH_SECRET,
  });

  registerErrorHandler(app);

  app.get("/health", async () => ({
    status: "ok",
  }));

  app.register(authRoutes, {
    prefix: "/api/v1/auth",
    authService,
    config,
  });

  if (pool) {
    app.addHook("onClose", async () => {
      await pool.end();
    });
  }

  return app;
}
