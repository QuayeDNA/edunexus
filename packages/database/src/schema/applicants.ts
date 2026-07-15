import { pgTable, uuid, text, timestamp, varchar, date, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { schools } from './schools';
import { gradeLevels } from './grade-levels';
import { classes } from './classes';
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
  guardianOccupation: varchar('guardian_occupation', { length: 100 }),
  guardianEmployer: varchar('guardian_employer', { length: 200 }),
  gradeLevelId: uuid('grade_level_id').notNull().references(() => gradeLevels.id),
  targetClassId: uuid('target_class_id').references(() => classes.id),
  previousSchool: varchar('previous_school', { length: 255 }),
  birthCertificateFileId: uuid('birth_certificate_file_id').references(() => mediaFiles.id),
  priorReportCardFileId: uuid('prior_report_card_file_id').references(() => mediaFiles.id),
  photoFileId: uuid('photo_file_id').references(() => mediaFiles.id),
  medicalAllergies: text('medical_allergies'),
  medicalConditions: text('medical_conditions'),
  medicalMedications: text('medical_medications'),
  doctorName: varchar('doctor_name', { length: 200 }),
  doctorPhone: varchar('doctor_phone', { length: 20 }),
  emergencyContacts: jsonb('emergency_contacts'),
  siblingsEnrolled: boolean('siblings_enrolled').default(false),
  siblingDetails: text('sibling_details'),
  status: varchar('status', { length: 20 }).default('submitted').notNull(),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
}, (table) => [
  index('idx_applicants_school_id').on(table.schoolId),
  index('idx_applicants_status').on(table.status),
  index('idx_applicants_school_status').on(table.schoolId, table.status),
  index('idx_applicants_target_class').on(table.targetClassId),
]);
