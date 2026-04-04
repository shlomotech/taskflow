import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';

export async function listGithubLinks(db: Database, taskId: string) {
  return db
    .select()
    .from(schema.githubPrLinks)
    .where(eq(schema.githubPrLinks.taskId, taskId));
}

export async function createGithubLink(
  db: Database,
  taskId: string,
  data: { prUrl: string; prNumber?: string; repo?: string },
) {
  const [link] = await db
    .insert(schema.githubPrLinks)
    .values({ taskId, prUrl: data.prUrl, prNumber: data.prNumber, repo: data.repo })
    .returning();
  return link;
}
