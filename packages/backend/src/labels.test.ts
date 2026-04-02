import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./app.js";
import type { AppEnv } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import type {
  DeleteLabelResult,
  LabelRecord,
  LabelService,
  TaskLabelResult,
} from "./services/label-service.js";

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

const label: LabelRecord = {
  id: "label-1",
  name: "Backend",
  color: "#2563eb",
};

const taskLabel: TaskLabelResult = {
  taskId: "task-1",
  labelId: label.id,
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

describe("label routes", () => {
  it("lists labels", async () => {
    const labelService = createLabelService({
      listLabels: vi.fn().mockResolvedValue([label]),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/labels",
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [label],
    });
    expect(labelService.listLabels).toHaveBeenCalledWith();
  });

  it("creates a label", async () => {
    const labelService = createLabelService({
      createLabel: vi.fn().mockResolvedValue(label),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/labels",
      headers: {
        authorization,
      },
      payload: {
        name: label.name,
        color: label.color,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: label,
    });
    expect(labelService.createLabel).toHaveBeenCalledWith({
      name: label.name,
      color: label.color,
    });
  });

  it("updates a label", async () => {
    const labelService = createLabelService({
      updateLabel: vi.fn().mockResolvedValue({
        ...label,
        color: "#16a34a",
      }),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/labels/${label.id}`,
      headers: {
        authorization,
      },
      payload: {
        color: "#16a34a",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(labelService.updateLabel).toHaveBeenCalledWith(label.id, {
      color: "#16a34a",
    });
  });

  it("deletes a label", async () => {
    const labelService = createLabelService({
      deleteLabel: vi.fn().mockResolvedValue({ id: label.id } satisfies DeleteLabelResult),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/labels/${label.id}`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: { id: label.id },
    });
    expect(labelService.deleteLabel).toHaveBeenCalledWith(label.id);
  });

  it("lists labels attached to a task", async () => {
    const labelService = createLabelService({
      listTaskLabels: vi.fn().mockResolvedValue([label]),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tasks/${taskLabel.taskId}/labels`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [label],
    });
    expect(labelService.listTaskLabels).toHaveBeenCalledWith(taskLabel.taskId, user.id);
  });

  it("adds a label to a task", async () => {
    const labelService = createLabelService({
      addLabelToTask: vi.fn().mockResolvedValue(taskLabel),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/tasks/${taskLabel.taskId}/labels/${taskLabel.labelId}`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: taskLabel,
    });
    expect(labelService.addLabelToTask).toHaveBeenCalledWith(
      taskLabel.taskId,
      taskLabel.labelId,
      user.id,
    );
  });

  it("removes a label from a task", async () => {
    const labelService = createLabelService({
      removeLabelFromTask: vi.fn().mockResolvedValue(taskLabel),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/tasks/${taskLabel.taskId}/labels/${taskLabel.labelId}`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: taskLabel,
    });
    expect(labelService.removeLabelFromTask).toHaveBeenCalledWith(
      taskLabel.taskId,
      taskLabel.labelId,
      user.id,
    );
  });

  it("rejects invalid label colors before hitting the service", async () => {
    const labelService = createLabelService();
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/labels",
      headers: {
        authorization,
      },
      payload: {
        name: label.name,
        color: "blue",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
    expect(labelService.createLabel).not.toHaveBeenCalled();
  });

  it("rejects refresh tokens on protected label routes", async () => {
    const labelService = createLabelService();
    const server = buildServer({
      env: testEnv,
      labelService,
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
      url: "/api/v1/labels",
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

  it("surfaces service-layer not found errors", async () => {
    const labelService = createLabelService({
      updateLabel: vi
        .fn()
        .mockRejectedValue(new AppError(404, "LABEL_NOT_FOUND", "Label not found")),
    });
    const { server, authorization } = await createServer(labelService);

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/labels/missing-label",
      headers: {
        authorization,
      },
      payload: {
        name: "Urgent",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "LABEL_NOT_FOUND",
      message: "Label not found",
      statusCode: 404,
    });
  });
});

function createLabelService(
  overrides: Partial<MockLabelService> = {},
): MockLabelService {
  return {
    listLabels: vi.fn().mockResolvedValue([]),
    createLabel: vi.fn().mockResolvedValue(label),
    updateLabel: vi.fn().mockResolvedValue(label),
    deleteLabel: vi.fn().mockResolvedValue({ id: label.id } satisfies DeleteLabelResult),
    listTaskLabels: vi.fn().mockResolvedValue([]),
    addLabelToTask: vi.fn().mockResolvedValue(taskLabel),
    removeLabelFromTask: vi.fn().mockResolvedValue(taskLabel),
    ...overrides,
  } as MockLabelService;
}

type MockLabelService = LabelService & {
  listLabels: ReturnType<typeof vi.fn>;
  createLabel: ReturnType<typeof vi.fn>;
  updateLabel: ReturnType<typeof vi.fn>;
  deleteLabel: ReturnType<typeof vi.fn>;
  listTaskLabels: ReturnType<typeof vi.fn>;
  addLabelToTask: ReturnType<typeof vi.fn>;
  removeLabelFromTask: ReturnType<typeof vi.fn>;
};

async function createServer(labelService: LabelService) {
  const server = buildServer({
    env: testEnv,
    labelService,
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
