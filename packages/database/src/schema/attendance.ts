import {
  pgTable, uuid, timestamp, varchar, date, text, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';
import { students } from './students';
import { staff } from './staff';
import { classes } from './classes';

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  studentId: uuid('student_id').notNull().references(() => students.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  date: date('date').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  checkIn: timestamp('check_in', { withTimezone: true }),
  checkOut: timestamp('check_out', { withTimezone: true }),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_attendance_school_id').on(table.schoolId),
  index('idx_attendance_student_id').on(table.studentId),
  index('idx_attendance_date').on(table.date),
  uniqueIndex('idx_attendance_student_date').on(table.studentId, table.date),
]);

export const staffAttendance = pgTable('staff_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  staffId: uuid('staff_id').notNull().references(() => staff.id),
  date: date('date').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  checkIn: timestamp('check_in', { withTimezone: true }),
  checkOut: timestamp('check_out', { withTimezone: true }),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_staff_attendance_school_id').on(table.schoolId),
  index('idx_staff_attendance_staff_id').on(table.staffId),
  index('idx_staff_attendance_date').on(table.date),
  uniqueIndex('idx_staff_attendance_unique').on(table.staffId, table.date),
]);
