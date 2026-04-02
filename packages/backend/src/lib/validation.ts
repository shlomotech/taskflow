import type { ZodTypeAny } from "zod";
import { AppError } from "./errors.js";

export function parseWithSchema<TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown,
) {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  const message = parsed.error.issues
    .map((issue) => issue.message)
    .join(", ");

  throw new AppError(400, "VALIDATION_ERROR", message || "Invalid request body");
}
