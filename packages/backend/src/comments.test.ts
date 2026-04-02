import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import { buildServer } from "./app.js";
import type {
  CommentRecord,
  CommentService,
  DeleteCommentResult,
} from "./services/comment-service.js";
import type { CreateCommentBody } from "./schemas/comments.js";

const TEST_ENV: AppEnv = {
  NODE_ENV: "test",
  PORT: 3001,
  DATABASE_URL: "postgres://localhost/taskflow_test",
  JWT_SECRET: "test-secret",
  CORS_ORIGIN: "http://localhost:3000",
};

const TASK_COMMENT: CommentRecord = {
  id: "comment-1",
  body: "Looks good",
  taskId: "task-1",
  author: {
    id: "user-1",
    name: "Casey",
    avatar: null,
  },
  createdAt: "2026-04-02T19:00:00.000Z",
  updatedAt: "2026-04-02T19:00:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("comment routes", () => {
  it("lists task comments for an authenticated request", async () => {
    const commentService = createCommentService({
      listTaskComments: vi.fn().mockResolvedValue([TASK_COMMENT]),
    });
    const server = buildServer({
      env: TEST_ENV,
      commentService,
    });
    const accessToken = await createToken(server, "access");

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/tasks/task-1/comments",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [TASK_COMMENT],
    });
    expect(commentService.listTaskComments).toHaveBeenCalledWith("task-1");

    await server.close();
  });

  it("creates a task comment for the authenticated user", async () => {
    const commentService = createCommentService({
      createComment: vi.fn().mockResolvedValue(TASK_COMMENT),
    });
    const server = buildServer({
      env: TEST_ENV,
      commentService,
    });
    const accessToken = await createToken(server, "access");

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tasks/task-1/comments",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        body: "Looks good",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: TASK_COMMENT,
    });
    expect(commentService.createComment).toHaveBeenCalledWith("task-1", "user-1", {
      body: "Looks good",
    });

    await server.close();
  });

  it("rejects an empty comment body", async () => {
    const commentService = createCommentService();
    const server = buildServer({
      env: TEST_ENV,
      commentService,
    });
    const accessToken = await createToken(server, "access");

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tasks/task-1/comments",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        body: "   ",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Comment body is required",
      statusCode: 400,
    });
    expect(commentService.createComment).not.toHaveBeenCalled();

    await server.close();
  });

  it("rejects refresh tokens on protected comment routes", async () => {
    const commentService = createCommentService();
    const server = buildServer({
      env: TEST_ENV,
      commentService,
    });
    const refreshToken = await createToken(server, "refresh");

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/tasks/task-1/comments",
      headers: {
        authorization: `Bearer ${refreshToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "INVALID_ACCESS_TOKEN",
      message: "Invalid access token",
      statusCode: 401,
    });

    await server.close();
  });

  it("returns service authorization errors when deleting a comment", async () => {
    const commentService = createCommentService({
      deleteComment: vi
        .fn()
        .mockRejectedValue(
          new AppError(403, "FORBIDDEN", "You are not allowed to delete this comment"),
        ),
    });
    const server = buildServer({
      env: TEST_ENV,
      commentService,
    });
    const accessToken = await createToken(server, "access");

    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/comments/comment-1",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "FORBIDDEN",
      message: "You are not allowed to delete this comment",
      statusCode: 403,
    });
    expect(commentService.deleteComment).toHaveBeenCalledWith("comment-1", "user-1");

    await server.close();
  });
});

function createCommentService(
  overrides: Partial<CommentService> = {},
) {
  const commentService = {
    listTaskComments: vi.fn(
      async (_taskId: string): Promise<CommentRecord[]> => [],
    ),
    createComment: vi.fn(
      async (
        _taskId: string,
        _authorId: string,
        _input: CreateCommentBody,
      ): Promise<CommentRecord> => TASK_COMMENT,
    ),
    deleteComment: vi.fn(
      async (
        _commentId: string,
        _userId: string,
      ): Promise<DeleteCommentResult> =>
        ({ id: "comment-1" } satisfies DeleteCommentResult),
    ),
  } satisfies CommentService;

  return {
    ...commentService,
    ...overrides,
  } as CommentService & {
    listTaskComments: typeof commentService.listTaskComments;
    createComment: typeof commentService.createComment;
    deleteComment: typeof commentService.deleteComment;
  };
}

async function createToken(
  server: ReturnType<typeof buildServer>,
  type: "access" | "refresh",
) {
  await server.ready();

  return server.jwt.sign({
    sub: "user-1",
    email: "user-1@example.com",
    type,
  });
}
