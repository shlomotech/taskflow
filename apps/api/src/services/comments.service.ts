import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { AppError } from './errors.js';

export async function listComments(db: Database, taskId: string) {
  return db.select().from(schema.comments).where(eq(schema.comments.taskId, taskId));
}

export async function createComment(
  db: Database,
  taskId: string,
  authorId: string,
  data: { body: string },
) {
  const [comment] = await db
    .insert(schema.comments)
    .values({ taskId, authorId, body: data.body })
    .returning();
  return comment;
}

export async function updateComment(
  db: Database,
  commentId: string,
  authorId: string,
  data: { body: string },
) {
  const [comment] = await db
    .update(schema.comments)
    .set({ body: data.body, updatedAt: new Date() })
    .where(and(eq(schema.comments.id, commentId), eq(schema.comments.authorId, authorId)))
    .returning();
  if (!comment) throw new AppError('NOT_FOUND', 404, 'Comment not found.');
  return comment;
}

export async function deleteComment(db: Database, commentId: string, authorId: string) {
  const [deleted] = await db
    .delete(schema.comments)
    .where(and(eq(schema.comments.id, commentId), eq(schema.comments.authorId, authorId)))
    .returning({ id: schema.comments.id });
  if (!deleted) throw new AppError('NOT_FOUND', 404, 'Comment not found.');
}
