import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";
import { parseWithSchema } from "../lib/validation.js";
import {
  commentParamsSchema,
  createCommentBodySchema,
  taskCommentsParamsSchema,
} from "../schemas/comments.js";
import type { CommentService } from "../services/comment-service.js";

interface CommentRoutesOptions {
  commentService: CommentService;
}

const commentRoutes: FastifyPluginAsync<CommentRoutesOptions> = async (
  server,
  options,
) => {
  server.addHook("preHandler", requireAccessToken);

  server.get("/tasks/:taskId/comments", async (request) => {
    const params = parseWithSchema(taskCommentsParamsSchema, request.params);
    const comments = await options.commentService.listTaskComments(params.taskId);

    return {
      data: comments,
    };
  });

  server.post("/tasks/:taskId/comments", async (request, reply) => {
    const params = parseWithSchema(taskCommentsParamsSchema, request.params);
    const body = parseWithSchema(createCommentBodySchema, request.body);
    const comment = await options.commentService.createComment(
      params.taskId,
      request.user.sub,
      body,
    );

    return reply.code(201).send({
      data: comment,
    });
  });

  server.delete("/comments/:id", async (request) => {
    const params = parseWithSchema(commentParamsSchema, request.params);
    const result = await options.commentService.deleteComment(
      params.id,
      request.user.sub,
    );

    return {
      data: result,
    };
  });
};

export default commentRoutes;

async function requireAccessToken(request: FastifyRequest) {
  await request.jwtVerify();

  if (request.user.type !== "access") {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Invalid access token");
  }
}
