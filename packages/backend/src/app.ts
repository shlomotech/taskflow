import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastify, { type FastifyInstance } from "fastify";
import { loadEnv, type AppEnv } from "./config/env.js";
import { createDatabasePool } from "./lib/db.js";
import { registerErrorHandler } from "./lib/errors.js";
import taskRoutes from "./routes/tasks.js";
import {
  PostgresTaskService,
  type TaskService,
} from "./services/task-service.js";

export interface BuildServerOptions {
  env?: AppEnv;
  taskService?: TaskService;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const env = options.env ?? loadEnv();
  const server = fastify({
    logger: env.NODE_ENV !== "test",
  });

  const databasePool = options.taskService
    ? null
    : createDatabasePool(env.DATABASE_URL);
  const taskService = options.taskService ?? new PostgresTaskService(databasePool!);

  server.register(cors, {
    credentials: true,
    origin: env.CORS_ORIGIN ?? true,
  });

  server.register(jwt, {
    secret: env.JWT_SECRET,
  });

  registerErrorHandler(server);

  server.register(taskRoutes, {
    prefix: "/api/v1",
    taskService,
  });

  if (databasePool) {
    server.addHook("onClose", async () => {
      await databasePool.end();
    });
  }

  return server;
}
