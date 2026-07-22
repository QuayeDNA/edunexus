import { pgTable, uuid, timestamp, date, varchar, index } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { staff } from "./staff";

export const employmentContracts = pgTable(
  "employment_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id),
    staffId: uuid("staff_id").notNull().references(() => staff.id),
    type: varchar("type", { length: 20 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    salary: varchar("salary", { length: 20 }),
    position: varchar("position", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_ec_school_id").on(table.schoolId),
    index("idx_ec_staff_id").on(table.staffId),
  ],
);
