import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  date,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { students } from "./students";
import { staff } from "./staff";
import { profiles } from "./profiles";

export const behaviorRecords = pgTable(
  "behavior_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => profiles.id),
    type: varchar("type", { length: 20 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description").notNull(),
    date: date("date").notNull(),
    action: varchar("action", { length: 100 }),
    resolved: boolean("resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_behavior_records_school_id").on(table.schoolId),
    index("idx_behavior_records_student_id").on(table.studentId),
    index("idx_behavior_records_type").on(table.type),
  ],
);

export const wellnessCheckins = pgTable(
  "wellness_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    mood: integer("mood").notNull(),
    energy: integer("energy"),
    sleep: integer("sleep"),
    notes: text("notes"),
    checkinDate: date("checkin_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_wellness_checkins_school_id").on(table.schoolId),
    index("idx_wellness_checkins_student_id").on(table.studentId),
    index("idx_wellness_checkins_date").on(table.checkinDate),
  ],
);

export const parentEngagements = pgTable(
  "parent_engagements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    guardianId: uuid("guardian_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    notes: text("notes"),
    engagementDate: date("engagement_date").notNull(),
    followUp: boolean("follow_up").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_parent_engagements_school_id").on(table.schoolId),
    index("idx_parent_engagements_student_id").on(table.studentId),
  ],
);

export const lessonPlans = pgTable(
  "lesson_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    classId: uuid("class_id").notNull(),
    subjectId: uuid("subject_id").notNull(),
    teacherId: uuid("teacher_id").references(() => staff.id),
    title: varchar("title", { length: 255 }).notNull(),
    objectives: text("objectives"),
    materials: text("materials"),
    activities: text("activities"),
    assessment: text("assessment"),
    week: integer("week"),
    termId: uuid("term_id"),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_lesson_plans_school_id").on(table.schoolId),
    index("idx_lesson_plans_class_id").on(table.classId),
    index("idx_lesson_plans_subject_id").on(table.subjectId),
  ],
);
