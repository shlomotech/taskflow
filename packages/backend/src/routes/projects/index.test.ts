import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { buildServer } from "../../app.js";
import type { AppEnv } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import type {
  DeleteProjectResult,
  ProjectRecord,
  ProjectService,
} from "../../services/project.service.js";

const testEnv: AppEnv = {
  NODE_ENV: "test",
  PORT: 3001,
  DATABASE_URL: "postgres://localhost:5432/taskflow_test",
  JWT_SECRET: "test-secret",
  CORS_ORIGIN: "http://localhost:3000",
};

const user = {
  id: "user-1",
  email: "ada@example.com",
};

const project: ProjectRecord = {
  id: "project-1",
  name: "Project Mercury",
  description: "Migration work",
  ownerId: user.id,
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

describe("projects routes", () => {
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

  it("returns a single project for the authenticated user", async () => {
    const projectService = createProjectService({
      getProjectForUser: vi.fn().mockResolvedValue(project),
    });
    const { server, authorization } = await createServer(projectService);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/projects/${project.id}`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: project,
    });
    expect(projectService.getProjectForUser).toHaveBeenCalledWith(
      project.id,
      user.id,
    );
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

  it("deletes an owned project", async () => {
    const projectService = createProjectService({
      deleteProject: vi.fn().mockResolvedValue({ id: project.id }),
    });
    const { server, authorization } = await createServer(projectService);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/projects/${project.id}`,
      headers: {
        authorization,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: { id: project.id },
    });
    expect(projectService.deleteProject).toHaveBeenCalledWith(
      project.id,
      user.id,
    );
  });

  it("rejects refresh tokens on protected project routes", async () => {
    const projectService = createProjectService();
    const server = buildServer({
      env: testEnv,
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
        expiresIn: "7d",
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
  overrides: Partial<MockedProjectService> = {},
): MockedProjectService {
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
      expiresIn: "15m",
    },
  );

  return {
    server,
    authorization: `Bearer ${accessToken}`,
  };
}

type MockedProjectService = ProjectService & {
  [K in keyof ProjectService]: Mock;
};
