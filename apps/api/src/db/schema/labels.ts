import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

import { projects } from './projects.js';

export const labels = pgTable('labels', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).notNull(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
});
