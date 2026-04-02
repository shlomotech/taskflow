import { z } from "zod";

const labelIdSchema = z.string().trim().min(1, "Label id is required");
const taskIdSchema = z.string().trim().min(1, "Task id is required");
const labelNameSchema = z
  .string()
  .trim()
  .min(1, "Label name is required")
  .max(50, "Label name must be 50 characters or fewer");
const labelColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Label color must be a valid hex color");

export const labelParamsSchema = z.object({
  id: labelIdSchema,
});

export const taskLabelsParamsSchema = z.object({
  taskId: taskIdSchema,
});

export const taskLabelParamsSchema = z.object({
  taskId: taskIdSchema,
  labelId: labelIdSchema,
});

export const createLabelBodySchema = z.object({
  name: labelNameSchema,
  color: labelColorSchema,
});

export const updateLabelBodySchema = z
  .object({
    name: labelNameSchema.optional(),
    color: labelColorSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.color !== undefined, {
    message: "At least one label field must be provided",
  });

export type LabelParams = z.infer<typeof labelParamsSchema>;
export type TaskLabelsParams = z.infer<typeof taskLabelsParamsSchema>;
export type TaskLabelParams = z.infer<typeof taskLabelParamsSchema>;
export type CreateLabelBody = z.infer<typeof createLabelBodySchema>;
export type UpdateLabelBody = z.infer<typeof updateLabelBodySchema>;
