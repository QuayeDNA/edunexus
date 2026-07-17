import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { profiles } from "./profiles";

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    audience: varchar("audience", { length: 50 }).notNull(),
    priority: varchar("priority", { length: 20 }).default("normal").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_announcements_school_id").on(table.schoolId),
    index("idx_announcements_audience").on(table.audience),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => profiles.id),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => profiles.id),
    subject: varchar("subject", { length: 255 }),
    body: text("body").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_messages_school_id").on(table.schoolId),
    index("idx_messages_sender_id").on(table.senderId),
    index("idx_messages_recipient_id").on(table.recipientId),
    index("idx_messages_is_read").on(table.isRead),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: uuid("reference_id"),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_notifications_school_id").on(table.schoolId),
    index("idx_notifications_profile_id").on(table.profileId),
    index("idx_notifications_is_read").on(table.isRead),
  ],
);
