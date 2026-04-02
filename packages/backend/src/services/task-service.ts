import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";
import type {
  CreateTaskBody,
  TaskPriority,
  TaskStatus,
  UpdateTaskBody,
} from "../schemas/tasks.js";
import type { LabelRecord } from "./label-service.js";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  assignee_id: string | null;
  position: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface OrderedTaskRow {
  id: string;
  position: number;
}

interface TaskAccessRow extends TaskRow {
  owner_id: string;
}

interface TaskLabelRow {
  task_id: string;
  id: string;
  name: string;
  color: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  position: number;
  labels: LabelRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DeleteTaskResult {
  id: string;
}

export interface TaskService {
  listProjectTasks(
    projectId: string,
    userId: string,
    status?: TaskStatus,
  ): Promise<TaskRecord[]>;
  createTask(
    projectId: string,
    userId: string,
    input: CreateTaskBody,
  ): Promise<TaskRecord>;
  getTaskForUser(taskId: string, userId: string): Promise<TaskRecord | null>;
  updateTask(
    taskId: string,
    userId: string,
    input: UpdateTaskBody,
  ): Promise<TaskRecord>;
  deleteTask(taskId: string, userId: string): Promise<DeleteTaskResult>;
}

export class PostgresTaskService implements TaskService {
  constructor(private readonly pool: Pool) {}

  async listProjectTasks(projectId: string, userId: string, status?: TaskStatus) {
    await this.ensureProjectAccess(projectId, userId);

    const values = [projectId];
    const statusFilter = status
      ? `AND status = $${values.push(status)}`
      : "";

    const result = await this.pool.query<TaskRow>(
      `
        SELECT
          id,
          title,
          description,
          status,
          priority,
          project_id,
          assignee_id,
          position,
          created_at,
          updated_at
        FROM tasks
        WHERE project_id = $1
        ${statusFilter}
        ORDER BY status ASC, position ASC, created_at ASC
      `,
      values,
    );

    return this.attachLabels(result.rows.map((row) => mapTaskRecord(row, [])));
  }

  async createTask(projectId: string, userId: string, input: CreateTaskBody) {
    await this.ensureProjectAccess(projectId, userId);

    const id = randomUUID();
    const status = input.status ?? "todo";
    const priority = input.priority ?? "medium";
    const position = await this.getEndPosition(projectId, status);

    await this.pool.query(
      `
        INSERT INTO tasks (
          id,
          title,
          description,
          status,
          priority,
          project_id,
          assignee_id,
          position
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        id,
        input.title.trim(),
        input.description?.trim() ?? null,
        status,
        priority,
        projectId,
        input.assigneeId ?? null,
        position,
      ],
    );

    return this.getTaskByIdOrThrow(id);
  }

  async getTaskForUser(taskId: string, userId: string) {
    const task = await this.getAccessibleTask(taskId, userId);

    if (!task) {
      return null;
    }

    return this.attachTaskLabels(mapTaskRecord(task, []));
  }

  async updateTask(taskId: string, userId: string, input: UpdateTaskBody) {
    const existing = await this.getTaskOrThrow(taskId, userId);
    const nextStatus = input.status ?? existing.status;
    const nextPosition =
      input.position !== undefined
        ? await this.getIndexedPosition(
            existing.projectId,
            nextStatus,
            input.position,
            taskId,
          )
        : input.status !== undefined && input.status !== existing.status
          ? await this.getEndPosition(existing.projectId, nextStatus, taskId)
          : existing.position;

    await this.pool.query(
      `
        UPDATE tasks
        SET title = $2,
            description = $3,
            status = $4,
            priority = $5,
            assignee_id = $6,
            position = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        taskId,
        input.title?.trim() ?? existing.title,
        input.description !== undefined
          ? input.description?.trim() ?? null
          : existing.description,
        nextStatus,
        input.priority ?? existing.priority,
        input.assigneeId !== undefined ? input.assigneeId : existing.assigneeId,
        nextPosition,
      ],
    );

    return this.getTaskByIdOrThrow(taskId);
  }

  async deleteTask(taskId: string, userId: string) {
    await this.getTaskOrThrow(taskId, userId);

    await this.pool.query(
      `
        DELETE FROM tasks
        WHERE id = $1
      `,
      [taskId],
    );

    return { id: taskId };
  }

  private async getTaskByIdOrThrow(taskId: string) {
    const result = await this.pool.query<TaskRow>(
      `
        SELECT
          id,
          title,
          description,
          status,
          priority,
          project_id,
          assignee_id,
          position,
          created_at,
          updated_at
        FROM tasks
        WHERE id = $1
        LIMIT 1
      `,
      [taskId],
    );

    const task = result.rows[0];

    if (!task) {
      throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    }

    return this.attachTaskLabels(mapTaskRecord(task, []));
  }

  private async ensureProjectAccess(projectId: string, userId: string) {
    const result = await this.pool.query<{ owner_id: string }>(
      `
        SELECT owner_id
        FROM projects
        WHERE id = $1
        LIMIT 1
      `,
      [projectId],
    );

    const project = result.rows[0];

    if (!project) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    if (project.owner_id !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this project");
    }
  }

  private async getAccessibleTask(taskId: string, userId: string) {
    const result = await this.pool.query<TaskAccessRow>(
      `
        SELECT
          t.id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.project_id,
          t.assignee_id,
          t.position,
          t.created_at,
          t.updated_at,
          p.owner_id
        FROM tasks t
        INNER JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1
        LIMIT 1
      `,
      [taskId],
    );

    const task = result.rows[0];

    if (!task) {
      return null;
    }

    if (task.owner_id !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this task");
    }

    return task;
  }

  private async getTaskOrThrow(taskId: string, userId: string) {
    const task = await this.getAccessibleTask(taskId, userId);

    if (!task) {
      throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    }

    return mapTaskRecord(task, []);
  }

  private async getEndPosition(
    projectId: string,
    status: TaskStatus,
    excludeTaskId?: string,
  ) {
    const values: Array<string | TaskStatus> = [projectId, status];
    const exclusion = excludeTaskId
      ? `AND id <> $${values.push(excludeTaskId)}`
      : "";
    const result = await this.pool.query<{ next_position: number | null }>(
      `
        SELECT COALESCE(MAX(position), 0) + 1024 AS next_position
        FROM tasks
        WHERE project_id = $1
          AND status = $2
          ${exclusion}
      `,
      values,
    );

    return Number(result.rows[0]?.next_position ?? 1024);
  }

  private async getIndexedPosition(
    projectId: string,
    status: TaskStatus,
    targetIndex: number,
    movingTaskId: string,
  ) {
    const result = await this.pool.query<OrderedTaskRow>(
      `
        SELECT id, position
        FROM tasks
        WHERE project_id = $1
          AND status = $2
          AND id <> $3
        ORDER BY position ASC, created_at ASC
      `,
      [projectId, status, movingTaskId],
    );

    return calculateFractionalPosition(
      result.rows.map((row) => row.position),
      targetIndex,
    );
  }

  private async attachLabels(tasks: TaskRecord[]) {
    if (tasks.length === 0) {
      return tasks;
    }

    const result = await this.pool.query<TaskLabelRow>(
      `
        SELECT
          tl.task_id,
          l.id,
          l.name,
          l.color
        FROM task_labels tl
        INNER JOIN labels l ON l.id = tl.label_id
        WHERE tl.task_id = ANY($1::text[])
        ORDER BY l.name ASC, l.id ASC
      `,
      [tasks.map((task) => task.id)],
    );

    const labelsByTaskId = new Map<string, LabelRecord[]>();

    for (const row of result.rows) {
      const labels = labelsByTaskId.get(row.task_id) ?? [];
      labels.push({
        id: row.id,
        name: row.name,
        color: row.color,
      });
      labelsByTaskId.set(row.task_id, labels);
    }

    return tasks.map((task) => ({
      ...task,
      labels: labelsByTaskId.get(task.id) ?? [],
    }));
  }

  private async attachTaskLabels(task: TaskRecord) {
    const [record] = await this.attachLabels([task]);
    return record;
  }
}

export function calculateFractionalPosition(
  orderedPositions: number[],
  targetIndex: number,
) {
  if (orderedPositions.length === 0) {
    return 1024;
  }

  const clampedIndex = Math.max(0, Math.min(targetIndex, orderedPositions.length));

  if (clampedIndex === 0) {
    return orderedPositions[0] / 2;
  }

  if (clampedIndex === orderedPositions.length) {
    return orderedPositions[orderedPositions.length - 1] + 1024;
  }

  return (orderedPositions[clampedIndex - 1] + orderedPositions[clampedIndex]) / 2;
}

function mapTaskRecord(task: TaskRow, labels: LabelRecord[]): TaskRecord {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.project_id,
    assigneeId: task.assignee_id,
    position: Number(task.position),
    labels,
    createdAt: toIsoString(task.created_at),
    updatedAt: toIsoString(task.updated_at),
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
