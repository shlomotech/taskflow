import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./app.js";
import { AppError } from "./lib/errors.js";
import type { AppEnv } from "./config/env.js";
import type { AuthService, AuthUser } from "./services/auth-service.js";

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

const servers = new Set<ReturnType<typeof buildServer>>();

afterEach(async () => {
  await Promise.all(
    Array.from(servers).map(async (server) => {
      await server.close();
      servers.delete(server);
    }),
  );
});

describe("auth routes", () => {
  it("registers a user and returns auth tokens", async () => {
    const authService: AuthService = {
      registerUser: vi.fn().mockResolvedValue(user),
      authenticateUser: vi.fn(),
      getUserById: vi.fn(),
    };
    const server = buildServer({ env: testEnv, authService });
    servers.add(server);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: user.email,
        name: user.name,
        password: "password123",
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();
    expect(body.user).toEqual(user);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(authService.registerUser).toHaveBeenCalledWith({
      email: user.email,
      name: user.name,
      password: "password123",
    });
  });

  it("rejects invalid login payloads before hitting the service", async () => {
    const authService: AuthService = {
      registerUser: vi.fn(),
      authenticateUser: vi.fn(),
      getUserById: vi.fn(),
    };
    const server = buildServer({ env: testEnv, authService });
    servers.add(server);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "not-an-email",
        password: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
    expect(authService.authenticateUser).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid credentials", async () => {
    const authService: AuthService = {
      registerUser: vi.fn(),
      authenticateUser: vi
        .fn()
        .mockRejectedValue(
          new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"),
        ),
      getUserById: vi.fn(),
    };
    const server = buildServer({ env: testEnv, authService });
    servers.add(server);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: user.email,
        password: "wrong-password",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
      statusCode: 401,
    });
  });

  it("issues a new access token for a valid refresh token", async () => {
    const authService: AuthService = {
      registerUser: vi.fn(),
      authenticateUser: vi.fn(),
      getUserById: vi.fn().mockResolvedValue(user),
    };
    const server = buildServer({ env: testEnv, authService });
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
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      accessToken: expect.any(String),
    });
    expect(authService.getUserById).toHaveBeenCalledWith(user.id);
  });

  it("rejects access tokens on the refresh endpoint", async () => {
    const authService: AuthService = {
      registerUser: vi.fn(),
      authenticateUser: vi.fn(),
      getUserById: vi.fn(),
    };
    const server = buildServer({ env: testEnv, authService });
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

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken: accessToken,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "INVALID_REFRESH_TOKEN",
      message: "Invalid refresh token",
      statusCode: 401,
    });
  });
});
