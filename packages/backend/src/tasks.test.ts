import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./app.js";
import type { AppEnv } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import {
  calculateFractionalPosition,
  type DeleteTaskResult,
  type TaskRecord,
  type TaskService,
} from "./services/task-service.js";

const testEnv: AppEnv = {
  NODE_ENV: "test",
  PORT: 3001,
  DATABASE_URL: "postgres://localhost:5432/taskflow_test",
  JWT_SECRET: "test-secret",
  JWT_ACCESS_EXPIRY: "15m",
  JWT_REFRESH_EXPIRY: "7d",
};

const user = {
  id: "user-1",
  email: "ada@example.com",
};

const task: TaskRecord = {
  id: "task-1",
  title: "Draft API contract",
  description: "Outline CRUD surface",
  status: "todo",
  priority: "high",
  projectId: "project-1",
  assigneeId: "user-2",
  position: 1024,
  labels: [
    {
      id: "label-1",
      name: "Backend",
      color: "#2563eb",
    },
  ],
  createdAt: "2026-04-02T19:00:00.000Z",
  updatedAt: "2026-04-02T19:00:00.000Z",
};

const servers = new Set<ReturnType<typeof buildServer>>();

afterEach(async () => {
  await Promise.all(
    Array.from(servers).map(async (server) => {
      await server.close();
      servers.delete(server);
    }),
  );
});

describe("task routes", () => {
  it("lists project tasks filtered by status", async () => {
    const taskService = createTaskService({
      listProjectTasks: vi.fn().mockResolvedValue([task]),
    });
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/projects/${task.projectId}/tasks?status=todo`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [task],
    });
    expect(taskService.listProjectTasks).toHaveBeenCalledWith(
      task.projectId,
      user.id,
      "todo",
    );
  });

  it("creates a task at the end of the requested column", async () => {
    const taskService = createTaskService({
      createTask: vi.fn().mockResolvedValue(task),
    });
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/projects/${task.projectId}/tasks`,
      headers: {
        authorization,
      },
      payload: {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: task,
    });
    expect(taskService.createTask).toHaveBeenCalledWith(task.projectId, user.id, {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
    });
  });

  it("returns a task with its labels", async () => {
    const taskService = createTaskService({
      getTaskForUser: vi.fn().mockResolvedValue(task),
    });
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tasks/${task.id}`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: task,
    });
  });

  it("returns 404 when a task is missing", async () => {
    const taskService = createTaskService({
      getTaskForUser: vi.fn().mockResolvedValue(null),
    });
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/tasks/missing-task",
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "TASK_NOT_FOUND",
      message: "Task not found",
      statusCode: 404,
    });
  });

  it("updates a task with a target index for reordering", async () => {
    const taskService = createTaskService({
      updateTask: vi.fn().mockResolvedValue({
        ...task,
        status: "in_progress",
        position: 512,
      }),
    });
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${task.id}`,
      headers: {
        authorization,
      },
      payload: {
        status: "in_progress",
        position: 0,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(taskService.updateTask).toHaveBeenCalledWith(task.id, user.id, {
      status: "in_progress",
      position: 0,
    });
  });

  it("deletes a task", async () => {
    const taskService = createTaskService({
      deleteTask: vi.fn().mockResolvedValue({ id: task.id } satisfies DeleteTaskResult),
    });
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/tasks/${task.id}`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: { id: task.id },
    });
    expect(taskService.deleteTask).toHaveBeenCalledWith(task.id, user.id);
  });

  it("rejects invalid status values before hitting the service", async () => {
    const taskService = createTaskService();
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/projects/${task.projectId}/tasks`,
      headers: {
        authorization,
      },
      payload: {
        title: task.title,
        status: "cancelled",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
    expect(taskService.createTask).not.toHaveBeenCalled();
  });

  it("rejects refresh tokens on protected task routes", async () => {
    const taskService = createTaskService();
    const server = buildServer({
      env: testEnv,
      taskService,
    });
    servers.add(server);
    await server.ready();

    const refreshToken = await server.jwt.sign({
      sub: user.id,
      email: user.email,
      type: "refresh" as const,
    });

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/projects/${task.projectId}/tasks`,
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
  });

  it("surfaces service-layer authorization errors", async () => {
    const taskService = createTaskService({
      updateTask: vi
        .fn()
        .mockRejectedValue(
          new AppError(403, "FORBIDDEN", "You do not have access to this task"),
        ),
    });
    const { server, authorization } = await createServer(taskService);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${task.id}`,
      headers: {
        authorization,
      },
      payload: {
        title: "Renamed task",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "FORBIDDEN",
      message: "You do not have access to this task",
      statusCode: 403,
    });
  });
});

describe("calculateFractionalPosition", () => {
  it("places a task between neighbors", () => {
    expect(calculateFractionalPosition([128, 256, 512], 2)).toBe(384);
  });

  it("places a task before the first neighbor", () => {
    expect(calculateFractionalPosition([1024, 2048], 0)).toBe(512);
  });

  it("places a task after the last neighbor", () => {
    expect(calculateFractionalPosition([1024, 2048], 2)).toBe(3072);
  });
});

function createTaskService(
  overrides: Partial<MockTaskService> = {},
): MockTaskService {
  return {
    listProjectTasks: vi.fn().mockResolvedValue([]),
    createTask: vi.fn().mockResolvedValue(task),
    getTaskForUser: vi.fn().mockResolvedValue(task),
    updateTask: vi.fn().mockResolvedValue(task),
    deleteTask: vi.fn().mockResolvedValue({ id: task.id } satisfies DeleteTaskResult),
    ...overrides,
  } as MockTaskService;
}

type MockTaskService = TaskService & {
  listProjectTasks: ReturnType<typeof vi.fn>;
  createTask: ReturnType<typeof vi.fn>;
  getTaskForUser: ReturnType<typeof vi.fn>;
  updateTask: ReturnType<typeof vi.fn>;
  deleteTask: ReturnType<typeof vi.fn>;
};

async function createServer(taskService: TaskService) {
  const server = buildServer({
    env: testEnv,
    taskService,
  });
  servers.add(server);
  await server.ready();

  const accessToken = await server.jwt.sign({
    sub: user.id,
    email: user.email,
    type: "access" as const,
  });

  return {
    server,
    authorization: `Bearer ${accessToken}`,
  };
}
