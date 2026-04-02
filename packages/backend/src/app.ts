import cors from "@fastify/cors";
import fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { loadEnv, type AppEnv } from "./config/env.js";
import { registerErrorHandler } from "./lib/errors.js";
import { createDatabasePool } from "./lib/db.js";
import authRoutes from "./routes/auth.js";
import labelRoutes from "./routes/labels.js";
import taskRoutes from "./routes/tasks.js";
import {
  PostgresAuthService,
  type AuthService,
} from "./services/auth-service.js";
import {
  PostgresLabelService,
  type LabelService,
} from "./services/label-service.js";
import {
  PostgresTaskService,
  type TaskService,
} from "./services/task-service.js";

export interface BuildServerOptions {
  env?: AppEnv;
  authService?: AuthService;
  taskService?: TaskService;
  labelService?: LabelService;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const env = options.env ?? loadEnv();
  const server = fastify({
    logger: env.NODE_ENV !== "test",
  });

  const databasePool =
    options.authService && options.taskService && options.labelService
      ? null
      : createDatabasePool(env.DATABASE_URL);
  const authService =
    options.authService ?? new PostgresAuthService(databasePool!);
  const taskService =
    options.taskService ?? new PostgresTaskService(databasePool!);
  const labelService =
    options.labelService ?? new PostgresLabelService(databasePool!);

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

  server.register(taskRoutes, {
    prefix: "/api/v1",
    taskService,
  });

  server.register(labelRoutes, {
    prefix: "/api/v1",
    labelService,
  });

  if (databasePool) {
    server.addHook("onClose", async () => {
      await databasePool.end();
    });
  }

  return server;
}
