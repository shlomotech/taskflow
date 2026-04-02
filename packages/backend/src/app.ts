import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastify, { type FastifyInstance } from "fastify";
import { loadEnv, type AppEnv } from "./config/env.js";
import { createDatabasePool } from "./lib/db.js";
import { registerErrorHandler } from "./lib/errors.js";
import projectsRoutes from "./routes/projects/index.js";
import {
  PostgresProjectService,
  type ProjectService,
} from "./services/project.service.js";

export interface BuildServerOptions {
  env?: AppEnv;
  projectService?: ProjectService;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const env = options.env ?? loadEnv();
  const server = fastify({
    logger: env.NODE_ENV !== "test",
  });

  const pool = options.projectService
    ? null
    : createDatabasePool(env.DATABASE_URL);
  const projectService =
    options.projectService ?? new PostgresProjectService(pool!);

  server.register(cors, {
    credentials: true,
    origin: env.CORS_ORIGIN ?? true,
  });

  server.register(jwt, {
    secret: env.JWT_SECRET,
  });

  registerErrorHandler(server);

  server.register(projectsRoutes, {
    prefix: "/api/v1/projects",
    projectService,
  });

  if (pool) {
    server.addHook("onClose", async () => {
      await pool.end();
    });
  }

  return server;
}
