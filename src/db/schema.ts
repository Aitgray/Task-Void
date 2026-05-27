import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  base_priority: integer('base_priority').notNull().default(3),
  scheduled_at: integer('scheduled_at').notNull(),
  status: text('status', { enum: ['active', 'completed', 'discarded'] })
    .notNull()
    .default('active'),
  retained: integer('retained').notNull().default(0),
  skip_count: integer('skip_count').notNull().default(0),
  last_skipped_at: integer('last_skipped_at'),
  archive_notes: text('archive_notes'),
  keywords: text('keywords'),
  device_scope: text('device_scope'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
  deleted_at: integer('deleted_at'),
  encrypted: integer('encrypted').notNull().default(0),
});
