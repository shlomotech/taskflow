import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { createConfig, type Config } from "./config.js";
import { AppError } from "./lib/errors.js";
import type { AuthService, AuthUser } from "./services/auth.service.js";

const user: AuthUser = {
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

interface RefreshJwtDecorator {
  refresh: {
    sign: ReturnType<typeof buildApp>["jwt"]["sign"];
  };
}

afterEach(async () => {
  await Promise.all(
    Array.from(servers).map(async (server) => {
      await server.close();
      servers.delete(server);
    }),
  );
});

function createAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    rotateRefreshToken: vi.fn(),
    storeRefreshToken: vi.fn(),
    ...overrides,
  };
}

describe("auth routes", () => {
  it("registers a user, returns an access token, and sets a secure refresh cookie", async () => {
    const authService = createAuthService({
      register: vi.fn().mockResolvedValue(user),
    });
    const app = buildApp({
      authService,
      config: testConfig,
      fastify: { logger: false },
    });
    servers.add(app);

    const response = await app.inject({
      method: "POST",
      payload: {
        email: user.email,
        name: user.name,
        password: "password123",
      },
      url: "/api/v1/auth/register",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      accessToken: expect.any(String),
      user,
    });
    expect(response.cookies[0]).toMatchObject({
      httpOnly: true,
      name: "refreshToken",
      sameSite: "Strict",
      secure: true,
    });
    expect(authService.storeRefreshToken).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid login payloads before hitting the service", async () => {
    const authService = createAuthService();
    const app = buildApp({
      authService,
      config: testConfig,
      fastify: { logger: false },
    });
    servers.add(app);

    const response = await app.inject({
      method: "POST",
      payload: {
        email: "not-an-email",
        password: "",
      },
      url: "/api/v1/auth/login",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
      statusCode: 400,
    });
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid credentials", async () => {
    const authService = createAuthService({
      login: vi
        .fn()
        .mockRejectedValue(
          new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"),
        ),
    });
    const app = buildApp({
      authService,
      config: testConfig,
      fastify: { logger: false },
    });
    servers.add(app);

    const response = await app.inject({
      method: "POST",
      payload: {
        email: user.email,
        password: "wrong-password",
      },
      url: "/api/v1/auth/login",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
      statusCode: 401,
    });
  });

  it("rotates a refresh token from the cookie and returns a new access token", async () => {
    const authService = createAuthService({
      rotateRefreshToken: vi.fn().mockResolvedValue(user),
    });
    const app = buildApp({
      authService,
      config: testConfig,
      fastify: { logger: false },
    });
    servers.add(app);
    await app.ready();

    const refreshToken = await (app.jwt as typeof app.jwt & RefreshJwtDecorator).refresh.sign(
      {
        email: user.email,
        jti: "266f2c84-d882-42a0-a1ce-cac687ad809c",
        sub: user.id,
        type: "refresh",
      },
      {
        expiresIn: testConfig.JWT_REFRESH_EXPIRY,
      },
    );

    const response = await app.inject({
      cookies: {
        refreshToken,
      },
      method: "POST",
      url: "/api/v1/auth/refresh",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      accessToken: expect.any(String),
    });
    expect(authService.rotateRefreshToken).toHaveBeenCalledWith({
      currentToken: refreshToken,
      expectedUserId: user.id,
      nextExpiresAt: expect.any(Date),
      nextToken: expect.any(String),
    });
    expect(response.cookies[0]).toMatchObject({
      httpOnly: true,
      name: "refreshToken",
      sameSite: "Strict",
      secure: true,
    });
  });

  it("logs out by deleting the refresh token and clearing the cookie", async () => {
    const authService = createAuthService({
      logout: vi.fn().mockResolvedValue(undefined),
    });
    const app = buildApp({
      authService,
      config: testConfig,
      fastify: { logger: false },
    });
    servers.add(app);

    const response = await app.inject({
      cookies: {
        refreshToken: "refresh-token-value",
      },
      method: "POST",
      url: "/api/v1/auth/logout",
    });

    expect(response.statusCode).toBe(204);
    expect(authService.logout).toHaveBeenCalledWith("refresh-token-value");
    expect(response.cookies[0]).toMatchObject({
      httpOnly: true,
      name: "refreshToken",
      sameSite: "Strict",
      secure: true,
      value: "",
    });
  });
});
