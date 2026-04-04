import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { AppError } from './errors.js';

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export async function listTasks(
  db: Database,
  projectId: string,
  filters: { status?: string; priority?: string; assigneeId?: string },
) {
  const conditions = [eq(schema.tasks.projectId, projectId)];
  if (filters.status) conditions.push(eq(schema.tasks.status, filters.status as TaskStatus));
  if (filters.priority) conditions.push(eq(schema.tasks.priority, filters.priority as TaskPriority));
  if (filters.assigneeId) conditions.push(eq(schema.tasks.assigneeId, filters.assigneeId));
  return db.select().from(schema.tasks).where(and(...conditions));
}

export async function createTask(
  db: Database,
  projectId: string,
  reporterId: string,
  data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: Date;
  },
) {
  const [task] = await db
    .insert(schema.tasks)
    .values({
      projectId,
      reporterId,
      title: data.title,
      description: data.description,
      status: (data.status ?? 'todo') as TaskStatus,
      priority: (data.priority ?? 'medium') as TaskPriority,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
    })
    .returning();
  return task;
}

export async function getTask(db: Database, taskId: string) {
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId))
    .limit(1);
  if (!task) throw new AppError('NOT_FOUND', 404, 'Task not found.');
  return task;
}

export async function updateTask(
  db: Database,
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: Date | null;
    position?: number;
  },
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) set.title = data.title;
  if (data.description !== undefined) set.description = data.description;
  if (data.status !== undefined) set.status = data.status;
  if (data.priority !== undefined) set.priority = data.priority;
  if ('assigneeId' in data) set.assigneeId = data.assigneeId;
  if ('dueDate' in data) set.dueDate = data.dueDate;
  if (data.position !== undefined) set.position = data.position;

  const [task] = await db
    .update(schema.tasks)
    .set(set)
    .where(eq(schema.tasks.id, taskId))
    .returning();
  if (!task) throw new AppError('NOT_FOUND', 404, 'Task not found.');
  return task;
}

export async function deleteTask(db: Database, taskId: string) {
  const [deleted] = await db
    .delete(schema.tasks)
    .where(eq(schema.tasks.id, taskId))
    .returning({ id: schema.tasks.id });
  if (!deleted) throw new AppError('NOT_FOUND', 404, 'Task not found.');
}

export async function assignTask(db: Database, taskId: string, assigneeId: string) {
  const [task] = await db
    .update(schema.tasks)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId))
    .returning();
  if (!task) throw new AppError('NOT_FOUND', 404, 'Task not found.');
  return task;
}

export async function unassignTask(db: Database, taskId: string) {
  const [task] = await db
    .update(schema.tasks)
    .set({ assigneeId: null, updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId))
    .returning();
  if (!task) throw new AppError('NOT_FOUND', 404, 'Task not found.');
  return task;
}
