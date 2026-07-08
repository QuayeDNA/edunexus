import {
  pgTable, uuid, text, timestamp, varchar, integer, numeric, date, boolean, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';
import { academicYears, terms } from './schools';
import { classes } from './classes';
import { subjects } from './subjects';
import { students } from './students';

export const assessmentTypes = pgTable('assessment_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_assessment_types_school_id').on(table.schoolId),
]);

export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  termId: uuid('term_id').notNull().references(() => terms.id),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYears.id),
  assessmentTypeId: uuid('assessment_type_id').notNull().references(() => assessmentTypes.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  maxScore: numeric('max_score', { precision: 6, scale: 2 }).notNull(),
  date: date('date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_assessments_school_id').on(table.schoolId),
  index('idx_assessments_class_id').on(table.classId),
  index('idx_assessments_subject_id').on(table.subjectId),
]);

export const assessmentScores = pgTable('assessment_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  assessmentId: uuid('assessment_id').notNull().references(() => assessments.id),
  studentId: uuid('student_id').notNull().references(() => students.id),
  score: numeric('score', { precision: 6, scale: 2 }).notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_assessment_scores_school_id').on(table.schoolId),
  index('idx_assessment_scores_assessment_id').on(table.assessmentId),
  index('idx_assessment_scores_student_id').on(table.studentId),
  uniqueIndex('idx_assessment_scores_unique').on(table.assessmentId, table.studentId),
]);

export const reportCards = pgTable('report_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  studentId: uuid('student_id').notNull().references(() => students.id),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYears.id),
  termId: uuid('term_id').notNull().references(() => terms.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  totalScore: numeric('total_score', { precision: 8, scale: 2 }),
  average: numeric('average', { precision: 5, scale: 2 }),
  position: integer('position'),
  classAverage: numeric('class_average', { precision: 5, scale: 2 }),
  teacherRemarks: text('teacher_remarks'),
  headRemarks: text('head_remarks'),
  nextTermStart: date('next_term_start'),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_report_cards_school_id').on(table.schoolId),
  index('idx_report_cards_student_id').on(table.studentId),
  uniqueIndex('idx_report_cards_unique').on(table.studentId, table.academicYearId, table.termId),
]);
