import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  date,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { students } from "./students";
import { staff } from "./staff";

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    isbn: varchar("isbn", { length: 20 }),
    title: varchar("title", { length: 255 }).notNull(),
    author: varchar("author", { length: 255 }).notNull(),
    publisher: varchar("publisher", { length: 255 }),
    yearPublished: integer("year_published"),
    category: varchar("category", { length: 100 }),
    shelfLocation: varchar("shelf_location", { length: 50 }),
    totalCopies: integer("total_copies").default(1).notNull(),
    availableCopies: integer("available_copies").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_books_school_id").on(table.schoolId),
    index("idx_books_category").on(table.category),
  ],
);

export const bookLoans = pgTable(
  "book_loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id),
    studentId: uuid("student_id").references(() => students.id),
    staffId: uuid("staff_id").references(() => staff.id),
    loanDate: date("loan_date").notNull(),
    dueDate: date("due_date").notNull(),
    returnDate: date("return_date"),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_book_loans_school_id").on(table.schoolId),
    index("idx_book_loans_book_id").on(table.bookId),
    index("idx_book_loans_borrower").on(table.studentId),
    index("idx_book_loans_status").on(table.status),
  ],
);
