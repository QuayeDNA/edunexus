import {
  pgTable, uuid, timestamp, varchar, index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_subjects_school_id').on(table.schoolId),
  index('idx_subjects_code').on(table.schoolId, table.code),
]);
