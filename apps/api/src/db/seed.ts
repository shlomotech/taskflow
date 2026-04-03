import { fileURLToPath } from 'node:url';

import { eq } from 'drizzle-orm';

import { db, sql } from './index.js';
import { projectMembers, projects, tasks, users } from './schema/index.js';

const sampleUser = {
  email: 'demo@taskflow.local',
  name: 'Demo User',
  passwordHash: 'seeded-password-hash',
};

const sampleProject = {
  name: 'TaskFlow Demo Project',
  description: 'Seeded workspace for local backend development.',
};

const sampleTasks = [
  {
    title: 'Backlog: Define MVP scope',
    description: 'Capture the first cut of launch requirements.',
    status: 'backlog' as const,
    priority: 'high' as const,
    position: 1000,
  },
  {
    title: 'Todo: Build authentication flow',
    description: 'Implement register, login, and token refresh endpoints.',
    status: 'todo' as const,
    priority: 'critical' as const,
    position: 2000,
  },
  {
    title: 'In progress: Stand up dashboard stats',
    description: 'Wire aggregate counts into the dashboard endpoint.',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    position: 3000,
  },
];

export async function seedDevData() {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, sampleUser.email))
    .limit(1);

  const [user] =
    existingUser.length > 0
      ? existingUser
      : await db.insert(users).values(sampleUser).returning({ id: users.id });

  if (!user) {
    throw new Error('Failed to create or load the seeded demo user');
  }

  const existingProject = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.name, sampleProject.name))
    .limit(1);

  const [project] =
    existingProject.length > 0
      ? existingProject
      : await db
          .insert(projects)
          .values({
            ...sampleProject,
            ownerId: user.id,
          })
          .returning({ id: projects.id });

  if (!project) {
    throw new Error('Failed to create or load the seeded demo project');
  }

  await db
    .insert(projectMembers)
    .values({
      projectId: project.id,
      userId: user.id,
      role: 'owner',
    })
    .onConflictDoNothing();

  await db.delete(tasks).where(eq(tasks.projectId, project.id));

  await db.insert(tasks).values(
    sampleTasks.map((task) => ({
      ...task,
      projectId: project.id,
      assigneeId: user.id,
      reporterId: user.id,
    })),
  );
}

async function main() {
  try {
    await seedDevData();
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
