import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { registerErrorHandler } from "./error-handler.js";

describe("registerErrorHandler", () => {
  const servers: Array<ReturnType<typeof Fastify>> = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  function buildTestServer() {
    const server = Fastify({ logger: false });
    registerErrorHandler(server);
    servers.push(server);
    return server;
  }

  it("maps Zod errors to 400 responses with field errors", async () => {
    const server = buildTestServer();

    server.get("/zod", async () => {
      z.object({
        email: z.string().email("Email is invalid"),
      }).parse({
        email: "bad-email",
      });
    });

    const response = await server.inject({
      method: "GET",
      url: "/zod",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Request validation failed",
      statusCode: 400,
      fieldErrors: {
        email: ["Email is invalid"],
      },
    });
  });

  it("maps Prisma unique constraint errors to 409", async () => {
    const server = buildTestServer();

    server.get("/conflict", async () => {
      throw Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: {
          target: ["email"],
        },
      });
    });

    const response = await server.inject({
      method: "GET",
      url: "/conflict",
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "CONFLICT",
      message: "Resource already exists",
      statusCode: 409,
      fieldErrors: {
        email: ["Already exists"],
      },
    });
  });

  it("maps Prisma not-found errors to 404", async () => {
    const server = buildTestServer();

    server.get("/missing", async () => {
      throw Object.assign(new Error("Record not found"), {
        code: "P2025",
      });
    });

    const response = await server.inject({
      method: "GET",
      url: "/missing",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "NOT_FOUND",
      message: "Resource not found",
      statusCode: 404,
    });
  });

  it("maps JWT errors to 401", async () => {
    const server = buildTestServer();

    server.get("/auth", async () => {
      throw Object.assign(new Error("Token expired"), {
        code: "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED",
      });
    });

    const response = await server.inject({
      method: "GET",
      url: "/auth",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "UNAUTHORIZED",
      message: "Invalid or expired token",
      statusCode: 401,
    });
  });

  it("returns AppError payloads without losing field errors", async () => {
    const server = buildTestServer();

    server.get("/app-error", async () => {
      throw new AppError(400, "VALIDATION_ERROR", "Bad payload", {
        fieldErrors: {
          title: ["Task title is required"],
        },
      });
    });

    const response = await server.inject({
      method: "GET",
      url: "/app-error",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Bad payload",
      statusCode: 400,
      fieldErrors: {
        title: ["Task title is required"],
      },
    });
  });
});
