import { afterEach, describe, expect, it, vi } from "vitest";

const validEnv = {
  DATABASE_URL: "postgres://taskflow:taskflow_dev@localhost:5432/taskflow",
  JWT_ACCESS_SECRET: "access-secret-with-at-least-32-chars",
  JWT_REFRESH_SECRET: "refresh-secret-with-at-least-32-chars",
  CORS_ORIGIN: "http://localhost:3000",
};

const originalEnv = { ...process.env };

async function loadConfigModule(env = validEnv) {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    ...env,
  };

  return import("./config.js");
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("createConfig", () => {
  it("applies defaults to optional values", async () => {
    const { createConfig } = await loadConfigModule();

    expect(createConfig(validEnv)).toEqual({
      ...validEnv,
      PORT: 3001,
      NODE_ENV: "development",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "7d",
    });
  });

  it("exports the parsed runtime config", async () => {
    const { config } = await loadConfigModule();

    expect(config.PORT).toBe(3001);
    expect(config.CORS_ORIGIN).toBe(validEnv.CORS_ORIGIN);
  });

  it("coerces the configured port", async () => {
    const { createConfig } = await loadConfigModule();

    expect(
      createConfig({
        ...validEnv,
        PORT: "4000",
      }).PORT,
    ).toBe(4000);
  });

  it("rejects missing required values", async () => {
    const { createConfig } = await loadConfigModule();

    expect(() =>
      createConfig({
        JWT_ACCESS_SECRET: validEnv.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: validEnv.JWT_REFRESH_SECRET,
        CORS_ORIGIN: validEnv.CORS_ORIGIN,
      }),
    ).toThrowError(/DATABASE_URL/);
  });

  it("rejects short JWT secrets", async () => {
    const { createConfig } = await loadConfigModule();

    expect(() =>
      createConfig({
        ...validEnv,
        JWT_ACCESS_SECRET: "short-secret",
      }),
    ).toThrowError(/JWT_ACCESS_SECRET/);
  });
});
