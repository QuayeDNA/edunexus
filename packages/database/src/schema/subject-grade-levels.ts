import { pgTable, uuid, timestamp, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { subjects } from "./subjects";
import { gradeLevels } from "./grade-levels";

export const subjectGradeLevels = pgTable(
  "subject_grade_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id),
    gradeLevelId: uuid("grade_level_id").notNull().references(() => gradeLevels.id),
    isCore: boolean("is_core").notNull().default(true),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_sgl_school_id").on(table.schoolId),
    index("idx_sgl_grade_level_id").on(table.gradeLevelId),
    uniqueIndex("idx_sgl_school_subject_grade").on(table.schoolId, table.subjectId, table.gradeLevelId),
  ],
);
