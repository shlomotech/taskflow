import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { createConfig, type Config } from "./config.js";
import type { CurrentUser, UsersService } from "./services/users.service.js";

const currentUser: CurrentUser = {
  avatar: "https://cdn.example.com/ada.png",
  createdAt: "2026-04-02T18:00:00.000Z",
  email: "ada@example.com",
  id: "user-1",
  name: "Ada Lovelace",
};

const testConfig: Config = createConfig({
  DATABASE_URL: "postgres://taskflow:change_me_in_production@localhost:5432/taskflow",
  JWT_SECRET: "change_me_in_tests_with_a_long_secret_12345",
  NODE_ENV: "test",
});

const servers = new Set<ReturnType<typeof buildApp>>();

afterEach(async () => {
  await Promise.all(
    Array.from(servers).map(async (server) => {
      await server.close();
      servers.delete(server);
    }),
  );
});

function createUsersService(overrides: Partial<UsersService> = {}): UsersService {
  return {
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
    ...overrides,
  };
}

async function createAccessToken(app: ReturnType<typeof buildApp>) {
  await app.ready();

  return app.jwt.sign({
    email: currentUser.email,
    id: currentUser.id,
    sub: currentUser.id,
    type: "access",
  });
}

describe("users routes", () => {
  it("returns the authenticated user profile", async () => {
    const usersService = createUsersService({
      getCurrentUser: vi.fn().mockResolvedValue(currentUser),
    });
    const app = buildApp({
      config: testConfig,
      fastify: { logger: false },
      usersService,
    });
    servers.add(app);

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(app)}`,
      },
      method: "GET",
      url: "/api/v1/users/me",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: currentUser,
    });
    expect(usersService.getCurrentUser).toHaveBeenCalledWith(currentUser.id);
  });

  it("rejects unauthenticated requests", async () => {
    const usersService = createUsersService();
    const app = buildApp({
      config: testConfig,
      fastify: { logger: false },
      usersService,
    });
    servers.add(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "UNAUTHORIZED",
      message: "Authentication required",
      statusCode: 401,
    });
    expect(usersService.getCurrentUser).not.toHaveBeenCalled();
  });

  it("validates patch payloads before calling the service", async () => {
    const usersService = createUsersService();
    const app = buildApp({
      config: testConfig,
      fastify: { logger: false },
      usersService,
    });
    servers.add(app);

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(app)}`,
      },
      method: "PATCH",
      payload: {},
      url: "/api/v1/users/me",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
      statusCode: 400,
    });
    expect(usersService.updateCurrentUser).not.toHaveBeenCalled();
  });

  it("updates the authenticated user profile", async () => {
    const usersService = createUsersService({
      updateCurrentUser: vi.fn().mockResolvedValue({
        ...currentUser,
        avatar: null,
        name: "Augusta Ada",
      }),
    });
    const app = buildApp({
      config: testConfig,
      fastify: { logger: false },
      usersService,
    });
    servers.add(app);

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(app)}`,
      },
      method: "PATCH",
      payload: {
        avatar: null,
        name: "Augusta Ada",
      },
      url: "/api/v1/users/me",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        ...currentUser,
        avatar: null,
        name: "Augusta Ada",
      },
    });
    expect(usersService.updateCurrentUser).toHaveBeenCalledWith(currentUser.id, {
      avatar: null,
      name: "Augusta Ada",
    });
  });
});
