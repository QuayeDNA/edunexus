import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  numeric,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { academicYears, terms } from "./schools";
import { students } from "./students";
import { classes } from "./classes";

export const feeCategories = pgTable(
  "fee_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    isOptional: boolean("is_optional").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_fee_categories_school_id").on(table.schoolId)],
);

export const feeSchedules = pgTable(
  "fee_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id),
    termId: uuid("term_id").references(() => terms.id),
    feeCategoryId: uuid("fee_category_id")
      .notNull()
      .references(() => feeCategories.id),
    classId: uuid("class_id").references(() => classes.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_fee_schedules_school_id").on(table.schoolId),
    index("idx_fee_schedules_category_id").on(table.feeCategoryId),
  ],
);

export const studentFees = pgTable(
  "student_fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    feeScheduleId: uuid("fee_schedule_id")
      .notNull()
      .references(() => feeSchedules.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paid: numeric("paid", { precision: 12, scale: 2 }).default("0").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_student_fees_school_id").on(table.schoolId),
    index("idx_student_fees_student_id").on(table.studentId),
    index("idx_student_fees_status").on(table.status),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    studentFeeId: uuid("student_fee_id").references(() => studentFees.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: varchar("method", { length: 50 }).notNull(),
    reference: varchar("reference", { length: 100 }),
    transactionId: varchar("transaction_id", { length: 100 }),
    momoProvider: varchar("momo_provider", { length: 20 }),
    paymentDate: date("payment_date").notNull(),
    status: varchar("status", { length: 20 }).default("completed").notNull(),
    receiptNumber: varchar("receipt_number", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_payments_school_id").on(table.schoolId),
    index("idx_payments_student_id").on(table.studentId),
    index("idx_payments_reference").on(table.reference),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    expenseDate: date("expense_date").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    receiptReference: varchar("receipt_reference", { length: 100 }),
    approvedBy: uuid("approved_by"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_expenses_school_id").on(table.schoolId),
    index("idx_expenses_category").on(table.category),
  ],
);
