import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { tasks } from './tasks.js';

export const githubPrLinks = pgTable('github_pr_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  prUrl: text('pr_url').notNull(),
  prNumber: varchar('pr_number', { length: 20 }),
  repo: varchar('repo', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
