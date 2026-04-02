import { z } from "zod";

const taskIdSchema = z.string().trim().min(1, "Task id is required");
const commentIdSchema = z.string().trim().min(1, "Comment id is required");

export const taskCommentsParamsSchema = z.object({
  taskId: taskIdSchema,
});

export const commentParamsSchema = z.object({
  id: commentIdSchema,
});

export const createCommentBodySchema = z.object({
  body: z.string().trim().min(1, "Comment body is required"),
});

export type TaskCommentsParams = z.infer<typeof taskCommentsParamsSchema>;
export type CommentParams = z.infer<typeof commentParamsSchema>;
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
