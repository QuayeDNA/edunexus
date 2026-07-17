import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  time,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { students } from "./students";
import { staff } from "./staff";

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    registrationNumber: varchar("registration_number", {
      length: 20,
    }).notNull(),
    model: varchar("model", { length: 100 }),
    capacity: integer("capacity").notNull(),
    driverName: varchar("driver_name", { length: 100 }),
    driverPhone: varchar("driver_phone", { length: 20 }),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_vehicles_school_id").on(table.schoolId)],
);

export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    driverId: uuid("driver_id").references(() => staff.id),
    morningPickup: time("morning_pickup"),
    eveningDropoff: time("evening_dropoff"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_routes_school_id").on(table.schoolId)],
);

export const studentTransport = pgTable(
  "student_transport",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id),
    pickupPoint: text("pickup_point"),
    dropoffPoint: text("dropoff_point"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_student_transport_school_id").on(table.schoolId),
    index("idx_student_transport_student_id").on(table.studentId),
    index("idx_student_transport_route_id").on(table.routeId),
  ],
);
