import { describe, expect, it } from "vitest";
import { loginBodySchema, registerBodySchema } from "./auth.js";
import { createLabelBodySchema, updateLabelBodySchema } from "./labels.js";
import { updateProjectBodySchema } from "./projects.js";
import { createTaskBodySchema, updateTaskBodySchema } from "./tasks.js";

describe("backend schemas", () => {
  it("validates auth payloads", () => {
    expect(
      registerBodySchema.parse({
        email: "dev@taskflow.app",
        name: "Dev",
        password: "password123",
      }),
    ).toEqual({
      email: "dev@taskflow.app",
      name: "Dev",
      password: "password123",
    });

    expect(() =>
      loginBodySchema.parse({
        email: "invalid",
        password: "",
      }),
    ).toThrow();
  });

  it("validates task enums and patch payload requirements", () => {
    expect(
      createTaskBodySchema.parse({
        title: "Ship validation",
        status: "todo",
        priority: "high",
      }),
    ).toEqual({
      title: "Ship validation",
      status: "todo",
      priority: "high",
    });

    expect(() =>
      createTaskBodySchema.parse({
        title: "Ship validation",
        status: "cancelled",
      }),
    ).toThrow();

    expect(() => updateTaskBodySchema.parse({})).toThrow(
      "At least one task field must be provided",
    );
  });

  it("requires project update payloads to change at least one field", () => {
    expect(() => updateProjectBodySchema.parse({})).toThrow(
      "At least one project field must be provided",
    );
  });

  it("validates label payloads", () => {
    expect(
      createLabelBodySchema.parse({
        name: "Backend",
        color: "#ff6600",
      }),
    ).toEqual({
      name: "Backend",
      color: "#ff6600",
    });

    expect(() =>
      updateLabelBodySchema.parse({
        color: "orange",
      }),
    ).toThrow("Label color must be a valid hex color");
  });
});
