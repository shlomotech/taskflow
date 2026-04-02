import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";
import type {
  CreateLabelBody,
  UpdateLabelBody,
} from "../schemas/labels.js";

interface LabelRow {
  id: string;
  name: string;
  color: string;
}

interface TaskAccessRow {
  owner_id: string;
}

export interface LabelRecord {
  id: string;
  name: string;
  color: string;
}

export interface DeleteLabelResult {
  id: string;
}

export interface TaskLabelResult {
  taskId: string;
  labelId: string;
}

export interface LabelService {
  listLabels(): Promise<LabelRecord[]>;
  createLabel(input: CreateLabelBody): Promise<LabelRecord>;
  updateLabel(labelId: string, input: UpdateLabelBody): Promise<LabelRecord>;
  deleteLabel(labelId: string): Promise<DeleteLabelResult>;
  listTaskLabels(taskId: string, userId: string): Promise<LabelRecord[]>;
  addLabelToTask(
    taskId: string,
    labelId: string,
    userId: string,
  ): Promise<TaskLabelResult>;
  removeLabelFromTask(
    taskId: string,
    labelId: string,
    userId: string,
  ): Promise<TaskLabelResult>;
}

export class PostgresLabelService implements LabelService {
  constructor(private readonly pool: Pool) {}

  async listLabels() {
    const result = await this.pool.query<LabelRow>(
      `
        SELECT id, name, color
        FROM labels
        ORDER BY name ASC, id ASC
      `,
    );

    return result.rows.map(mapLabelRecord);
  }

  async createLabel(input: CreateLabelBody) {
    const result = await this.pool.query<LabelRow>(
      `
        INSERT INTO labels (id, name, color)
        VALUES ($1, $2, $3)
        RETURNING id, name, color
      `,
      [randomUUID(), input.name.trim(), input.color.trim()],
    );

    return mapLabelRecord(result.rows[0]);
  }

  async updateLabel(labelId: string, input: UpdateLabelBody) {
    const existing = await this.getLabelOrThrow(labelId);
    const result = await this.pool.query<LabelRow>(
      `
        UPDATE labels
        SET name = $2,
            color = $3
        WHERE id = $1
        RETURNING id, name, color
      `,
      [
        labelId,
        input.name?.trim() ?? existing.name,
        input.color?.trim() ?? existing.color,
      ],
    );

    return mapLabelRecord(result.rows[0]);
  }

  async deleteLabel(labelId: string) {
    const result = await this.pool.query<{ id: string }>(
      `
        DELETE FROM labels
        WHERE id = $1
        RETURNING id
      `,
      [labelId],
    );

    const label = result.rows[0];

    if (!label) {
      throw new AppError(404, "LABEL_NOT_FOUND", "Label not found");
    }

    return { id: label.id };
  }

  async listTaskLabels(taskId: string, userId: string) {
    await this.ensureTaskAccess(taskId, userId);

    const result = await this.pool.query<LabelRow>(
      `
        SELECT l.id, l.name, l.color
        FROM task_labels tl
        INNER JOIN labels l ON l.id = tl.label_id
        WHERE tl.task_id = $1
        ORDER BY l.name ASC, l.id ASC
      `,
      [taskId],
    );

    return result.rows.map(mapLabelRecord);
  }

  async addLabelToTask(taskId: string, labelId: string, userId: string) {
    await this.ensureTaskAccess(taskId, userId);
    await this.getLabelOrThrow(labelId);

    await this.pool.query(
      `
        INSERT INTO task_labels (task_id, label_id)
        VALUES ($1, $2)
        ON CONFLICT (task_id, label_id) DO NOTHING
      `,
      [taskId, labelId],
    );

    return {
      taskId,
      labelId,
    };
  }

  async removeLabelFromTask(taskId: string, labelId: string, userId: string) {
    await this.ensureTaskAccess(taskId, userId);
    await this.getLabelOrThrow(labelId);

    await this.pool.query(
      `
        DELETE FROM task_labels
        WHERE task_id = $1
          AND label_id = $2
      `,
      [taskId, labelId],
    );

    return {
      taskId,
      labelId,
    };
  }

  private async getLabelOrThrow(labelId: string) {
    const result = await this.pool.query<LabelRow>(
      `
        SELECT id, name, color
        FROM labels
        WHERE id = $1
        LIMIT 1
      `,
      [labelId],
    );

    const label = result.rows[0];

    if (!label) {
      throw new AppError(404, "LABEL_NOT_FOUND", "Label not found");
    }

    return mapLabelRecord(label);
  }

  private async ensureTaskAccess(taskId: string, userId: string) {
    const result = await this.pool.query<TaskAccessRow>(
      `
        SELECT p.owner_id
        FROM tasks t
        INNER JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [taskId],
    );

    const task = result.rows[0];

    if (!task) {
      throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    }

    if (task.owner_id !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this task");
    }
  }
}

function mapLabelRecord(label: LabelRow): LabelRecord {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
  };
}
