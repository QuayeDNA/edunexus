import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }).notNull(),
    quantity: integer("quantity").default(0).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    reorderLevel: integer("reorder_level").default(0).notNull(),
    location: varchar("location", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_inventory_items_school_id").on(table.schoolId),
    index("idx_inventory_items_category").on(table.category),
  ],
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id),
    type: varchar("type", { length: 20 }).notNull(),
    quantity: integer("quantity").notNull(),
    reference: varchar("reference", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_inventory_transactions_school_id").on(table.schoolId),
    index("idx_inventory_transactions_item_id").on(table.itemId),
    index("idx_inventory_transactions_type").on(table.type),
  ],
);
