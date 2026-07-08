import {
  pgTable, uuid, text, timestamp, varchar, jsonb, index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  userId: uuid('user_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: uuid('record_id'),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_audit_logs_school_id').on(table.schoolId),
  index('idx_audit_logs_user_id').on(table.userId),
  index('idx_audit_logs_action').on(table.action),
  index('idx_audit_logs_table_name').on(table.tableName),
  index('idx_audit_logs_created_at').on(table.createdAt),
]);
