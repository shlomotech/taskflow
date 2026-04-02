import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "./errors.js";
import { parseWithSchema } from "./validation.js";

describe("parseWithSchema", () => {
  it("returns parsed data for valid input", () => {
    const schema = z.object({
      count: z.coerce.number().int(),
    });

    expect(parseWithSchema(schema, { count: "2" })).toEqual({ count: 2 });
  });

  it("throws AppError with field errors for invalid input", () => {
    const schema = z.object({
      email: z.string().email("Email is invalid"),
      password: z.string().min(8, "Password is too short"),
    });

    let thrownError: unknown;

    try {
      parseWithSchema(schema, {
        email: "invalid",
        password: "short",
      });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(AppError);
    expect(thrownError).toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      fieldErrors: {
        email: ["Email is invalid"],
        password: ["Password is too short"],
      },
    });
  });
});
