import {
  pgTable, uuid, timestamp, varchar, integer, index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';

export const gradeLevels = pgTable('grade_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  level: integer('level').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_grade_levels_school_id').on(table.schoolId),
  index('idx_grade_levels_sort_order').on(table.schoolId, table.sortOrder),
]);
