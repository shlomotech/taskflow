import { describe, expect, it } from "vitest";

const TEST_DATABASE_URL =
  "postgres://taskflow:change_me_in_production@localhost:5432/taskflow";

async function createApp() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

  const { buildApp } = await import("./app.js");
  const app = buildApp({ logger: false });

  return app;
}

describe("buildApp", () => {
  it("responds on /health", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });

    await app.close();
  });

  it("requires JWT auth through fastify.authenticate", async () => {
    const app = await createApp();

    app.get(
      "/api/v1/protected",
      {
        preHandler: [app.authenticate],
      },
      async () => ({ ok: true }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/protected",
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("rate limits auth routes after ten requests per minute", async () => {
    const app = await createApp();

    app.post("/api/v1/auth/login", async () => ({ ok: true }));

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
      });

      expect(response.statusCode).toBe(200);
    }

    const limitedResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
    });

    expect(limitedResponse.statusCode).toBe(429);

    await app.close();
  });
});
