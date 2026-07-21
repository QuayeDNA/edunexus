import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").references(() => schools.id),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash"),
    role: varchar("role", { length: 20 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    avatar: text("avatar"),
    authUserId: varchar("auth_user_id", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_profiles_school_id").on(table.schoolId),
    uniqueIndex("idx_profiles_school_email").on(table.schoolId, table.email),
    index("idx_profiles_role").on(table.role),
  ],
);
