import { z } from "zod";

const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required")
  .max(120, "Project name must be 120 characters or fewer");

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Project description must be 1000 characters or fewer");

export const projectParamsSchema = z.object({
  id: z.string().trim().min(1, "Project id is required"),
});

export const createProjectBodySchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema.optional(),
});

export const updateProjectBodySchema = z
  .object({
    name: projectNameSchema.optional(),
    description: projectDescriptionSchema.nullable().optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined,
    {
      message: "At least one project field must be provided",
    },
  );

export type ProjectParams = z.infer<typeof projectParamsSchema>;
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
