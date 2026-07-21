import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { academicYears } from "./schools";
import { gradeLevels } from "./grade-levels";
import { staff } from "./staff";

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 20 }),
    gradeLevelId: uuid("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id),
    homeroomTeacherId: uuid("homeroom_teacher_id").references(() => staff.id),
    capacity: integer("capacity"),
    roomNumber: varchar("room_number", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_classes_school_id").on(table.schoolId),
    index("idx_classes_grade_level_id").on(table.gradeLevelId),
    index("idx_classes_academic_year_id").on(table.academicYearId),
    index("idx_classes_teacher_id").on(table.homeroomTeacherId),
  ],
);
