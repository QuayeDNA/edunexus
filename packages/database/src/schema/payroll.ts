import {
  pgTable, uuid, text, timestamp, varchar, numeric, date, index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';
import { staff } from './staff';

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  month: varchar('month', { length: 7 }).notNull(),
  year: varchar('year', { length: 4 }).notNull(),
  totalGross: numeric('total_gross', { precision: 14, scale: 2 }).default('0').notNull(),
  totalDeductions: numeric('total_deductions', { precision: 14, scale: 2 }).default('0').notNull(),
  totalNet: numeric('total_net', { precision: 14, scale: 2 }).default('0').notNull(),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processedBy: uuid('processed_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_payroll_runs_school_id').on(table.schoolId),
  index('idx_payroll_runs_month_year').on(table.schoolId, table.month, table.year),
]);

export const payslips = pgTable('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id),
  staffId: uuid('staff_id').notNull().references(() => staff.id),
  basicSalary: numeric('basic_salary', { precision: 12, scale: 2 }).notNull(),
  allowances: numeric('allowances', { precision: 12, scale: 2 }).default('0').notNull(),
  deductions: numeric('deductions', { precision: 12, scale: 2 }).default('0').notNull(),
  ssnitEmployee: numeric('ssnit_employee', { precision: 12, scale: 2 }).default('0').notNull(),
  ssnitEmployer: numeric('ssnit_employer', { precision: 12, scale: 2 }).default('0').notNull(),
  payeTax: numeric('paye_tax', { precision: 12, scale: 2 }).default('0').notNull(),
  grossPay: numeric('gross_pay', { precision: 12, scale: 2 }).notNull(),
  netPay: numeric('net_pay', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_payslips_school_id').on(table.schoolId),
  index('idx_payslips_payroll_run_id').on(table.payrollRunId),
  index('idx_payslips_staff_id').on(table.staffId),
]);
