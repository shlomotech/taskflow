import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(["backlog", "todo", "in_progress", "in_review", "done"])
    .default("todo"),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
