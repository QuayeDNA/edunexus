import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  time,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { classes } from "./classes";
import { subjects } from "./subjects";
import { staff } from "./staff";

export const timetableSlots = pgTable(
  "timetable_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => staff.id),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    roomNumber: varchar("room_number", { length: 20 }),
    termId: uuid("term_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_timetable_school_id").on(table.schoolId),
    index("idx_timetable_class_id").on(table.classId),
    index("idx_timetable_teacher_id").on(table.teacherId),
    index("idx_timetable_day_class").on(table.dayOfWeek, table.classId),
  ],
);
