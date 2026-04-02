import { z } from "zod";
import { AppError } from "./errors.js";

export function parseWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issue = result.error.issues[0];
    throw new AppError(400, "VALIDATION_ERROR", issue?.message ?? "Invalid request");
  }

  return result.data;
}
