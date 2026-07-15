import { students } from '@edunexus/database';
import { sql, like } from 'drizzle-orm';

export async function generateStudentId(
  q: any,
  schoolId: string,
  schoolCode: string,
): Promise<string> {
  const year = new Date().getFullYear().toString();
  const pattern = `${schoolCode}${year}%`;

  const rows = await q
    .select({ maxId: sql<string>`MAX(${students.studentIdNumber})` })
    .from(students)
    .where(like(students.studentIdNumber, pattern));

  const result = rows[0]?.maxId;

  let nextSeq = 1;
  if (result) {
    const parts = result.split(year);
    if (parts.length === 2) {
      nextSeq = parseInt(parts[1], 10) + 1;
    }
  }

  return `${schoolCode}${year}${String(nextSeq).padStart(4, '0')}`;
}
