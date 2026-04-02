import type { ZodTypeAny } from "zod";
import { AppError, formatZodFieldErrors } from "./errors.js";

export function parseWithSchema<TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown,
) {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", {
    fieldErrors: formatZodFieldErrors(parsed.error.issues),
    cause: parsed.error,
  });
}
