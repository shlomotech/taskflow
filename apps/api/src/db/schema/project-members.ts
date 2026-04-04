import { pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './users.js';

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', {
      length: 32,
      enum: ['owner', 'member', 'viewer'],
    })
      .notNull()
      .default('member'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
  }),
);
