import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { AppError } from './errors.js';

export async function listProjects(db: Database, userId: string) {
  const rows = await db
    .select({ project: schema.projects })
    .from(schema.projects)
    .innerJoin(
      schema.projectMembers,
      and(
        eq(schema.projectMembers.projectId, schema.projects.id),
        eq(schema.projectMembers.userId, userId),
      ),
    );
  return rows.map((r) => r.project);
}

export async function createProject(
  db: Database,
  userId: string,
  data: { name: string; description?: string },
) {
  const [project] = await db
    .insert(schema.projects)
    .values({ name: data.name, description: data.description, ownerId: userId })
    .returning();
  await db
    .insert(schema.projectMembers)
    .values({ projectId: project.id, userId, role: 'owner' });
  return project;
}

export async function getProject(db: Database, projectId: string) {
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  if (!project) throw new AppError('NOT_FOUND', 404, 'Project not found.');
  return project;
}

export async function updateProject(
  db: Database,
  projectId: string,
  userId: string,
  data: { name?: string; description?: string },
) {
  const [updated] = await db
    .update(schema.projects)
    .set(data)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.ownerId, userId)))
    .returning();
  if (!updated) throw new AppError('NOT_FOUND', 404, 'Project not found or insufficient permissions.');
  return updated;
}

export async function deleteProject(db: Database, projectId: string, userId: string) {
  const [deleted] = await db
    .delete(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.ownerId, userId)))
    .returning({ id: schema.projects.id });
  if (!deleted) throw new AppError('NOT_FOUND', 404, 'Project not found or insufficient permissions.');
}
