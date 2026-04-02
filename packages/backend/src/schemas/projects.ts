import { z } from "zod";

const nameSchema = z.string().trim().min(1, "Project name is required");
const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description must be 2000 characters or fewer")
  .nullable();

export const createProjectBodySchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional(),
});

export const updateProjectBodySchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export const projectParamsSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
});

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
