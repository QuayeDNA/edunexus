import {
  pgTable, uuid, text, timestamp, jsonb, varchar, boolean, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  logo: text('logo'),
  region: varchar('region', { length: 100 }),
  curriculum: varchar('curriculum', { length: 50 }).default('ghana_basic').notNull(),
  calendar: varchar('calendar', { length: 50 }).default('ghana_3_terms').notNull(),
  grading: varchar('grading', { length: 50 }).default('ghana_basic').notNull(),
  domain: varchar('domain', { length: 255 }),
  customDomain: varchar('custom_domain', { length: 255 }),
  config: jsonb('config').default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const academicYears = pgTable('academic_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  name: varchar('name', { length: 100 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isCurrent: boolean('is_current').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_academic_years_school_id').on(table.schoolId),
  uniqueIndex('idx_academic_years_school_name').on(table.schoolId, table.name),
]);

export const terms = pgTable('terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYears.id),
  termNumber: varchar('term_number', { length: 10 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isCurrent: boolean('is_current').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_terms_school_id').on(table.schoolId),
  index('idx_terms_academic_year_id').on(table.academicYearId),
  uniqueIndex('idx_terms_school_year_number').on(table.schoolId, table.academicYearId, table.termNumber),
]);
