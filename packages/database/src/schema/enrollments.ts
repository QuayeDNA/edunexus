import {
  pgTable,
  uuid,
  timestamp,
  date,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { students } from "./students";
import { classes } from "./classes";
import { academicYears } from "./schools";

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    enrollmentDate: date("enrollment_date").notNull(),
    endDate: date("end_date"),
    transferReason: varchar("transfer_reason", { length: 255 }),
    transferSchoolName: varchar("transfer_school_name", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_enrollments_school_id").on(table.schoolId),
    index("idx_enrollments_student_id").on(table.studentId),
    index("idx_enrollments_class_id").on(table.classId),
    index("idx_enrollments_academic_year_id").on(table.academicYearId),
  ],
);
