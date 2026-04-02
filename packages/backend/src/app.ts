import cors from "@fastify/cors";
import fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { loadEnv, type AppEnv } from "./config/env.js";
import { registerErrorHandler } from "./lib/errors.js";
import { createDatabasePool } from "./lib/db.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import {
  PostgresAuthService,
  type AuthService,
} from "./services/auth-service.js";
import {
  PostgresProjectService,
  type ProjectService,
} from "./services/project-service.js";

export interface BuildServerOptions {
  env?: AppEnv;
  authService?: AuthService;
  projectService?: ProjectService;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const env = options.env ?? loadEnv();
  const server = fastify({
    logger: env.NODE_ENV !== "test",
  });

  const databasePool = options.authService && options.projectService
    ? null
    : createDatabasePool(env.DATABASE_URL);
  const authService =
    options.authService ?? new PostgresAuthService(databasePool!);
  const projectService =
    options.projectService ?? new PostgresProjectService(databasePool!);

  server.register(cors, {
    credentials: true,
    origin: env.CORS_ORIGIN ?? true,
  });

  server.register(jwt, {
    secret: env.JWT_SECRET,
  });

  registerErrorHandler(server);

  server.register(authRoutes, {
    prefix: "/api/v1/auth",
    authService,
    env,
  });

  server.register(projectRoutes, {
    prefix: "/api/v1/projects",
    projectService,
  });

  if (databasePool) {
    server.addHook("onClose", async () => {
      await databasePool.end();
    });
  }

  return server;
}
