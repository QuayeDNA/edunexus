import { pgTable, uuid, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { curricula } from "./curricula";
import { subjects } from "./subjects";

export const curriculumSubjects = pgTable(
  "curriculum_subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id),
    curriculumId: uuid("curriculum_id").notNull().references(() => curricula.id),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_cs_curriculum_id").on(table.curriculumId),
    uniqueIndex("idx_cs_school_curriculum_subject").on(table.schoolId, table.curriculumId, table.subjectId),
  ],
);
