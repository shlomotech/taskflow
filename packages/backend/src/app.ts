import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, {
  type FastifyPluginAsync,
  type FastifyServerOptions,
} from "fastify";
import { createConfig, type Config } from "./config.js";
import { createDatabasePool } from "./lib/db.js";
import { registerErrorHandler } from "./lib/errors.js";
import usersRoutes from "./routes/users/index.js";
import {
  PostgresUsersService,
  type UsersService,
} from "./services/users.service.js";

export interface BuildAppOptions {
  config?: Config;
  fastify?: FastifyServerOptions;
  usersService?: UsersService;
}

export function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? createConfig();
  const app = Fastify({
    logger: config.NODE_ENV !== "test",
    ...options.fastify,
  });

  const pool = options.usersService ? null : createDatabasePool(config.DATABASE_URL);
  const usersService = options.usersService ?? new PostgresUsersService(pool!);

  app.register(cors, {
    credentials: true,
    origin: config.CORS_ORIGIN ?? true,
  });

  app.register(jwt as FastifyPluginAsync<{ secret: string }>, {
    secret: config.JWT_ACCESS_SECRET,
  });

  registerErrorHandler(app);

  app.get("/health", async () => ({
    status: "ok",
  }));

  app.register(usersRoutes, {
    prefix: "/api/v1/users",
    usersService,
  });

  if (pool) {
    app.addHook("onClose", async () => {
      await pool.end();
    });
  }

  return app;
}
