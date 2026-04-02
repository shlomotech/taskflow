import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastify, { type FastifyInstance } from "fastify";
import { loadEnv, type AppEnv } from "./config/env.js";
import { createDatabasePool } from "./lib/db.js";
import { registerErrorHandler } from "./lib/errors.js";
import commentRoutes from "./routes/comments.js";
import {
  PostgresCommentService,
  type CommentService,
} from "./services/comment-service.js";

export interface BuildServerOptions {
  env?: AppEnv;
  commentService?: CommentService;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const env = options.env ?? loadEnv();
  const server = fastify({
    logger: env.NODE_ENV !== "test",
  });

  const databasePool = options.commentService
    ? null
    : createDatabasePool(env.DATABASE_URL);
  const commentService =
    options.commentService ?? new PostgresCommentService(databasePool!);

  server.register(cors, {
    credentials: true,
    origin: env.CORS_ORIGIN ?? true,
  });

  server.register(jwt, {
    secret: env.JWT_SECRET,
  });

  registerErrorHandler(server);

  server.register(commentRoutes, {
    prefix: "/api/v1",
    commentService,
  });

  if (databasePool) {
    server.addHook("onClose", async () => {
      await databasePool.end();
    });
  }

  return server;
}
