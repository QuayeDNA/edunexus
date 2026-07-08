import { and, eq, asc, desc } from 'drizzle-orm';
import type { PgTableWithColumns, TableConfig } from 'drizzle-orm/pg-core';
import type { DatabaseClient } from './client';

type Table = PgTableWithColumns<TableConfig>;

export function tenantQuery<T extends Table>(
  db: DatabaseClient,
  table: T,
  schoolIdColumn: keyof T['_']['columns'] & string,
) {
  function findAll(opts?: { sortBy?: string; sortOrder?: 'asc' | 'desc'; limit?: number; offset?: number }) {
    const conditions = [eq(table[schoolIdColumn as keyof typeof table] as any, schoolIdColumn)];
    const query = db.select().from(table).where(and(...conditions));
    // TODO: apply sorting, pagination
    return query;
  }

  function findById(id: string) {
    return db
      .select()
      .from(table)
      .where(
        and(
          eq((table as any).id, id),
          eq(table[schoolIdColumn as keyof typeof table] as any, schoolIdColumn),
        ),
      )
      .then((rows) => rows[0] ?? null);
  }

  function create(data: any) {
    return db.insert(table).values({ ...data, [schoolIdColumn]: schoolIdColumn }).returning();
  }

  function update(id: string, data: any) {
    return db
      .update(table)
      .set(data)
      .where(
        and(
          eq((table as any).id, id),
          eq(table[schoolIdColumn as keyof typeof table] as any, schoolIdColumn),
        ),
      )
      .returning();
  }

  function remove(id: string) {
    return db
      .delete(table)
      .where(
        and(
          eq((table as any).id, id),
          eq(table[schoolIdColumn as keyof typeof table] as any, schoolIdColumn),
        ),
      )
      .returning();
  }

  return { findAll, findById, create, update, remove };
}
