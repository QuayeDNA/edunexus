import {
  pgTable,
  uuid,
  varchar,
  numeric,
  jsonb,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const schoolPlans = pgTable("school_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  features: jsonb("features").$type<string[]>().default([]),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 })
    .notNull()
    .default("monthly"),
  maxStudents: integer("max_students").notNull().default(0),
  maxStaff: integer("max_staff").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const schoolSubscriptions = pgTable(
  "school_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => schoolPlans.id),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    schoolIdx: index("idx_school_subscriptions_school").on(table.schoolId),
    planIdx: index("idx_school_subscriptions_plan").on(table.planId),
    statusIdx: index("idx_school_subscriptions_status").on(table.status),
  }),
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    subscriptionId: uuid("subscription_id").references(
      () => schoolSubscriptions.id,
    ),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    schoolIdx: index("idx_invoices_school").on(table.schoolId),
    statusIdx: index("idx_invoices_status").on(table.status),
  }),
);
