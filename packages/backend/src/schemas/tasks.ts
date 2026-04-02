import { z } from "zod";

export const taskStatusSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
]);

export const taskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Task title is required")
  .max(200, "Task title must be 200 characters or fewer");

const taskDescriptionSchema = z
  .string()
  .trim()
  .max(2000, "Task description must be 2000 characters or fewer");

const taskIdSchema = z.string().trim().min(1, "Task id is required");
const projectIdSchema = z.string().trim().min(1, "Project id is required");

export const taskParamsSchema = z.object({
  id: taskIdSchema,
});

export const projectTasksParamsSchema = z.object({
  projectId: projectIdSchema,
});

export const taskListQuerySchema = z.object({
  status: taskStatusSchema.optional(),
});

export const createTaskBodySchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().trim().min(1, "Assignee id is required").nullable().optional(),
});

export const updateTaskBodySchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema.nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: z.string().trim().min(1, "Assignee id is required").nullable().optional(),
    position: z.coerce.number().int().min(0, "Position must be zero or greater").optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.status !== undefined ||
      value.priority !== undefined ||
      value.assigneeId !== undefined ||
      value.position !== undefined,
    {
      message: "At least one task field must be provided",
    },
  );

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskParams = z.infer<typeof taskParamsSchema>;
export type ProjectTasksParams = z.infer<typeof projectTasksParamsSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
