import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./app.js";
import type { AppEnv } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import type { AuthService, AuthUser } from "./services/auth-service.js";
import type {
  DeleteProjectResult,
  ProjectRecord,
  ProjectService,
} from "./services/project-service.js";

const testEnv: AppEnv = {
  NODE_ENV: "test",
  PORT: 3001,
  DATABASE_URL: "postgres://localhost:5432/taskflow_test",
  JWT_SECRET: "test-secret",
  JWT_ACCESS_EXPIRY: "15m",
  JWT_REFRESH_EXPIRY: "7d",
};

const user: AuthUser = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
};

const project: ProjectRecord = {
  id: "project-1",
  name: "Project Mercury",
  description: "Migration work",
  ownerId: user.id,
  createdAt: "2026-04-02T19:00:00.000Z",
  updatedAt: "2026-04-02T19:00:00.000Z",
};

const authService: AuthService = {
  registerUser: vi.fn(),
  authenticateUser: vi.fn(),
  getUserById: vi.fn(),
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

describe("project routes", () => {
  it("lists the authenticated user's projects", async () => {
    const projectService = createProjectService({
      listProjectsForUser: vi.fn().mockResolvedValue([project]),
    });
    const { server, authorization } = await createServer(projectService);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/projects",
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [project],
    });
    expect(projectService.listProjectsForUser).toHaveBeenCalledWith(user.id);
  });

  it("creates a project for the authenticated user", async () => {
    const projectService = createProjectService({
      createProject: vi.fn().mockResolvedValue(project),
    });
    const { server, authorization } = await createServer(projectService);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/projects",
      headers: {
        authorization,
      },
      payload: {
        name: project.name,
        description: project.description,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      data: project,
    });
    expect(projectService.createProject).toHaveBeenCalledWith(user.id, {
      name: project.name,
      description: project.description,
    });
  });

  it("returns 404 when a project is not accessible to the user", async () => {
    const projectService = createProjectService({
      getProjectForUser: vi.fn().mockResolvedValue(null),
    });
    const { server, authorization } = await createServer(projectService);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/projects/missing-project",
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "PROJECT_NOT_FOUND",
      message: "Project not found",
      statusCode: 404,
    });
  });

  it("returns 403 when a non-owner updates a project", async () => {
    const projectService = createProjectService({
      updateProject: vi
        .fn()
        .mockRejectedValue(
          new AppError(
            403,
            "FORBIDDEN",
            "You do not have access to this project",
          ),
        ),
    });
    const { server, authorization } = await createServer(projectService);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.id}`,
      headers: {
        authorization,
      },
      payload: {
        name: "Renamed project",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "FORBIDDEN",
      message: "You do not have access to this project",
      statusCode: 403,
    });
  });

  it("rejects refresh tokens on protected project routes", async () => {
    const projectService = createProjectService();
    const server = buildServer({
      env: testEnv,
      authService,
      projectService,
    });
    servers.add(server);
    await server.ready();

    const refreshToken = await server.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        type: "refresh" as const,
      },
      {
        expiresIn: testEnv.JWT_REFRESH_EXPIRY,
      },
    );

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/projects",
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
});

function createProjectService(
  overrides: Partial<ProjectService> = {},
): ProjectService & {
  listProjectsForUser: ReturnType<typeof vi.fn>;
  createProject: ReturnType<typeof vi.fn>;
  getProjectForUser: ReturnType<typeof vi.fn>;
  updateProject: ReturnType<typeof vi.fn>;
  deleteProject: ReturnType<typeof vi.fn>;
} {
  return {
    listProjectsForUser: vi.fn().mockResolvedValue([]),
    createProject: vi.fn().mockResolvedValue(project),
    getProjectForUser: vi.fn().mockResolvedValue(project),
    updateProject: vi.fn().mockResolvedValue(project),
    deleteProject: vi.fn().mockResolvedValue({ id: project.id } satisfies DeleteProjectResult),
    ...overrides,
  };
}

async function createServer(projectService: ProjectService) {
  const server = buildServer({
    env: testEnv,
    authService,
    projectService,
  });
  servers.add(server);
  await server.ready();

  const accessToken = await server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: "access" as const,
    },
    {
      expiresIn: testEnv.JWT_ACCESS_EXPIRY,
    },
  );

  return {
    server,
    authorization: `Bearer ${accessToken}`,
  };
}
