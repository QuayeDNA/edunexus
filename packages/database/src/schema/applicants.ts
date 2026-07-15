import { pgTable, uuid, text, timestamp, varchar, date, index } from 'drizzle-orm/pg-core';
import { schools } from './schools';
import { gradeLevels } from './grade-levels';
import { mediaFiles } from './media-files';

export const applicants = pgTable('applicants', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  guardianName: varchar('guardian_name', { length: 200 }).notNull(),
  guardianEmail: varchar('guardian_email', { length: 255 }).notNull(),
  guardianPhone: varchar('guardian_phone', { length: 20 }),
  guardianAddress: text('guardian_address'),
  gradeLevelId: uuid('grade_level_id').notNull().references(() => gradeLevels.id),
  previousSchool: varchar('previous_school', { length: 255 }),
  birthCertificateFileId: uuid('birth_certificate_file_id').references(() => mediaFiles.id),
  status: varchar('status', { length: 20 }).default('submitted').notNull(),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_applicants_school_id').on(table.schoolId),
  index('idx_applicants_status').on(table.status),
  index('idx_applicants_school_status').on(table.schoolId, table.status),
]);
