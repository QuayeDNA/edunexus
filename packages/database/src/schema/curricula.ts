import { pgTable, uuid, timestamp, varchar, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_curricula_school_id").on(table.schoolId),
    uniqueIndex("idx_curricula_school_code").on(table.schoolId, table.code),
  ],
);
