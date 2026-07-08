import {
  pgTable, uuid, timestamp, varchar, index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';
import { classes } from './classes';
import { subjects } from './subjects';
import { staff } from './staff';

export const classSubjects = pgTable('class_subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  teacherId: uuid('teacher_id').references(() => staff.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_class_subjects_school_id').on(table.schoolId),
  index('idx_class_subjects_class_id').on(table.classId),
  index('idx_class_subjects_subject_id').on(table.subjectId),
  index('idx_class_subjects_teacher_id').on(table.teacherId),
]);
