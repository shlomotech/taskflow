import { z } from "zod";

export const updateCurrentUserBodySchema = z
  .object({
    avatar: z
      .string()
      .trim()
      .url("Avatar must be a valid URL")
      .max(2048)
      .nullable()
      .optional(),
    name: z.string().trim().min(1, "Name is required").max(100).optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.avatar !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export type UpdateCurrentUserBody = z.infer<typeof updateCurrentUserBodySchema>;
