import {
  pgTable, uuid, text, timestamp, varchar, date, boolean, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  studentIdNumber: varchar('student_id_number', { length: 50 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  otherNames: varchar('other_names', { length: 100 }),
  gender: varchar('gender', { length: 10 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  placeOfBirth: varchar('place_of_birth', { length: 100 }),
  nationality: varchar('nationality', { length: 100 }).default('Ghanaian'),
  religion: varchar('religion', { length: 50 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  bloodGroup: varchar('blood_group', { length: 10 }),
  medicalNotes: text('medical_notes'),
  enrollmentDate: date('enrollment_date').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('idx_students_school_id').on(table.schoolId),
  uniqueIndex('idx_students_school_id_number').on(table.schoolId, table.studentIdNumber),
  index('idx_students_status').on(table.status),
]);

export const guardians = pgTable('guardians', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  occupation: varchar('occupation', { length: 100 }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_guardians_school_id').on(table.schoolId),
]);

export const studentGuardians = pgTable('student_guardians', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  guardianId: uuid('guardian_id').notNull().references(() => guardians.id),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  isEmergency: boolean('is_emergency').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_student_guardians_student_id').on(table.studentId),
  index('idx_student_guardians_guardian_id').on(table.guardianId),
]);
