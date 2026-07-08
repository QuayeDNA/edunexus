import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from './client';

export function tenantQuery<T extends Record<string, any>>(
  db: DatabaseClient,
  table: T,
  schoolIdColumn: keyof T,
) {
  return function (schoolId: string) {
    const scoped = (col: keyof T) => eq(table[col] as any, schoolId);

    function findAll() {
      return db.select().from(table as any).where(scoped(schoolIdColumn));
    }

    function findById(id: string) {
      return db
        .select()
        .from(table as any)
        .where(and(eq((table as any).id, id), scoped(schoolIdColumn)))
        .then((rows: any[]) => rows[0] ?? null);
    }

    function create(data: Partial<T>) {
      return db
        .insert(table as any)
        .values({ ...data, [schoolIdColumn]: schoolId })
        .returning();
    }

    function update(id: string, data: Partial<T>) {
      return db
        .update(table as any)
        .set(data)
        .where(and(eq((table as any).id, id), scoped(schoolIdColumn)))
        .returning();
    }

    function remove(id: string) {
      return db
        .delete(table as any)
        .where(and(eq((table as any).id, id), scoped(schoolIdColumn)))
        .returning();
    }

    return { findAll, findById, create, update, remove };
  };
}
