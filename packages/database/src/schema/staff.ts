import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    staffIdNumber: varchar("staff_id_number", { length: 50 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    otherNames: varchar("other_names", { length: 100 }),
    gender: varchar("gender", { length: 10 }).notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    nationality: varchar("nationality", { length: 100 }).default("Ghanaian"),
    religion: varchar("religion", { length: 50 }),
    address: text("address"),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    role: varchar("role", { length: 50 }).notNull(),
    department: varchar("department", { length: 100 }),
    employmentStatus: varchar("employment_status", { length: 20 })
      .default("permanent")
      .notNull(),
    dateHired: date("date_hired").notNull(),
    qualification: varchar("qualification", { length: 100 }),
    ssnitNumber: varchar("ssnit_number", { length: 50 }),
    bankName: varchar("bank_name", { length: 100 }),
    bankAccount: varchar("bank_account", { length: 50 }),
    emergencyContact: varchar("emergency_contact", { length: 20 }),
    emergencyName: varchar("emergency_name", { length: 100 }),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_staff_school_id").on(table.schoolId),
    uniqueIndex("idx_staff_school_id_number").on(
      table.schoolId,
      table.staffIdNumber,
    ),
    index("idx_staff_status").on(table.status),
  ],
);
