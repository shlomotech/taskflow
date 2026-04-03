import {
  pgTable,
  real,
  timestamp,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.js';
import { users } from './users.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', {
    length: 32,
    enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'],
  })
    .notNull()
    .default('todo'),
  priority: varchar('priority', {
    length: 32,
    enum: ['critical', 'high', 'medium', 'low'],
  })
    .notNull()
    .default('medium'),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  assigneeId: uuid('assignee_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => users.id),
  position: real('position').notNull().default(0),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
