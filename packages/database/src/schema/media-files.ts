import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { profiles } from "./profiles";

export const mediaFiles = pgTable(
  "media_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    size: integer("size").notNull(),
    storageProvider: varchar("storage_provider", { length: 20 }).notNull(),
    storagePath: text("storage_path").notNull(),
    checksum: varchar("checksum", { length: 64 }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_media_files_school_id").on(table.schoolId),
    index("idx_media_files_entity").on(table.entityType, table.entityId),
    index("idx_media_files_uploaded_by").on(table.uploadedBy),
    index("idx_media_files_school_entity").on(
      table.schoolId,
      table.entityType,
      table.entityId,
    ),
  ],
);
