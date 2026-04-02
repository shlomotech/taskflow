import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";
import type { CreateCommentBody } from "../schemas/comments.js";

interface CommentRow {
  id: string;
  body: string;
  task_id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface DeleteCommentRow {
  id: string;
  author_id: string;
}

export interface CommentAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface CommentRecord {
  id: string;
  body: string;
  taskId: string;
  author: CommentAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteCommentResult {
  id: string;
}

export interface CommentService {
  listTaskComments(taskId: string): Promise<CommentRecord[]>;
  createComment(
    taskId: string,
    authorId: string,
    input: CreateCommentBody,
  ): Promise<CommentRecord>;
  deleteComment(commentId: string, userId: string): Promise<DeleteCommentResult>;
}

export class PostgresCommentService implements CommentService {
  constructor(private readonly pool: Pool) {}

  async listTaskComments(taskId: string) {
    await this.ensureTaskExists(taskId);

    const result = await this.pool.query<CommentRow>(
      `
        SELECT
          c.id,
          c.body,
          c.task_id,
          c.author_id,
          u.name AS author_name,
          NULL::text AS author_avatar,
          c.created_at,
          c.updated_at
        FROM comments c
        INNER JOIN users u ON u.id = c.author_id
        WHERE c.task_id = $1
        ORDER BY c.created_at ASC, c.id ASC
      `,
      [taskId],
    );

    return result.rows.map(mapCommentRecord);
  }

  async createComment(taskId: string, authorId: string, input: CreateCommentBody) {
    await this.ensureTaskExists(taskId);

    const commentId = randomUUID();
    const result = await this.pool.query<CommentRow>(
      `
        WITH inserted AS (
          INSERT INTO comments (id, body, task_id, author_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id, body, task_id, author_id, created_at, updated_at
        )
        SELECT
          inserted.id,
          inserted.body,
          inserted.task_id,
          inserted.author_id,
          u.name AS author_name,
          NULL::text AS author_avatar,
          inserted.created_at,
          inserted.updated_at
        FROM inserted
        INNER JOIN users u ON u.id = inserted.author_id
      `,
      [commentId, input.body.trim(), taskId, authorId],
    );

    return mapCommentRecord(result.rows[0]);
  }

  async deleteComment(commentId: string, userId: string) {
    const result = await this.pool.query<DeleteCommentRow>(
      `
        SELECT id, author_id
        FROM comments
        WHERE id = $1
        LIMIT 1
      `,
      [commentId],
    );

    const comment = result.rows[0];

    if (!comment) {
      throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");
    }

    if (comment.author_id !== userId) {
      throw new AppError(403, "FORBIDDEN", "You are not allowed to delete this comment");
    }

    await this.pool.query(
      `
        DELETE FROM comments
        WHERE id = $1
      `,
      [commentId],
    );

    return { id: commentId };
  }

  private async ensureTaskExists(taskId: string) {
    const result = await this.pool.query<{ id: string }>(
      `
        SELECT id
        FROM tasks
        WHERE id = $1
        LIMIT 1
      `,
      [taskId],
    );

    if (!result.rows[0]) {
      throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    }
  }
}

function mapCommentRecord(comment: CommentRow): CommentRecord {
  return {
    id: comment.id,
    body: comment.body,
    taskId: comment.task_id,
    author: {
      id: comment.author_id,
      name: comment.author_name,
      avatar: comment.author_avatar,
    },
    createdAt: toIsoString(comment.created_at),
    updatedAt: toIsoString(comment.updated_at),
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
