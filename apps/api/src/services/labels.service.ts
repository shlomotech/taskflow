import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { AppError } from './errors.js';

export async function listLabels(db: Database, projectId: string) {
  return db.select().from(schema.labels).where(eq(schema.labels.projectId, projectId));
}

export async function createLabel(
  db: Database,
  projectId: string,
  data: { name: string; color: string },
) {
  const [label] = await db
    .insert(schema.labels)
    .values({ projectId, name: data.name, color: data.color })
    .returning();
  return label;
}

export async function updateLabel(
  db: Database,
  labelId: string,
  projectId: string,
  data: { name?: string; color?: string },
) {
  const [label] = await db
    .update(schema.labels)
    .set(data)
    .where(and(eq(schema.labels.id, labelId), eq(schema.labels.projectId, projectId)))
    .returning();
  if (!label) throw new AppError('NOT_FOUND', 404, 'Label not found.');
  return label;
}

export async function deleteLabel(db: Database, labelId: string, projectId: string) {
  const [deleted] = await db
    .delete(schema.labels)
    .where(and(eq(schema.labels.id, labelId), eq(schema.labels.projectId, projectId)))
    .returning({ id: schema.labels.id });
  if (!deleted) throw new AppError('NOT_FOUND', 404, 'Label not found.');
}
