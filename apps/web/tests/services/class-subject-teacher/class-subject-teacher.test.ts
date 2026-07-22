import { vi, describe, it, expect } from 'vitest';
import { getMatrix, saveMatrix } from '@/services/class-subject-teacher/class-subject-teacher';

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn((cb: any) => cb({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    })),
  };
}

const schoolId = 'school-1';

describe('getMatrix', () => {
  it('returns empty matrix when no classes or subjects', async () => {
    const mockDb = createMockDb();
    mockDb.orderBy.mockResolvedValueOnce([]);
    mockDb.orderBy.mockResolvedValueOnce([]);
    const result = await getMatrix({ db: mockDb, schoolId }, 'gl-1', 'ay-1');
    expect(result.classes).toHaveLength(0);
    expect(result.subjects).toHaveLength(0);
    expect(result.assignments).toHaveLength(0);
  });

  it('returns classes, subjects, and assignments', async () => {
    const mockDb = createMockDb();
    mockDb.orderBy.mockResolvedValueOnce([{ id: 'c-1', name: 'Class 1', code: 'P1-A' }]);
    mockDb.orderBy.mockResolvedValueOnce([{ id: 's-1', name: 'Math', code: 'MATH', isCore: true }]);
    mockDb.where.mockImplementationOnce(() => mockDb);
    mockDb.where.mockImplementationOnce(() => mockDb);
    mockDb.where.mockResolvedValueOnce([{ classId: 'c-1', subjectId: 's-1', teacherId: null }]);
    const result = await getMatrix({ db: mockDb, schoolId }, 'gl-1', 'ay-1');
    expect(result.classes).toHaveLength(1);
    expect(result.subjects).toHaveLength(1);
    expect(result.assignments).toHaveLength(1);
  });
});

describe('saveMatrix', () => {
  it('saves valid assignments and returns count', async () => {
    const mockDb = createMockDb();
    mockDb.limit.mockResolvedValue([{ id: 't-1' }]);
    mockDb.transaction = vi.fn((cb: any) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    }));
    const result = await saveMatrix({ db: mockDb, schoolId }, 'gl-1', [
      { classId: 'c-1', subjectId: 's-1', teacherId: 't-1' },
    ]);
    expect(result.saved).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for invalid teacher IDs', async () => {
    const mockDb = createMockDb();
    mockDb.limit.mockResolvedValue([]);
    mockDb.transaction = vi.fn((cb: any) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    }));
    const result = await saveMatrix({ db: mockDb, schoolId }, 'gl-1', [
      { classId: 'c-1', subjectId: 's-1', teacherId: 'bad-id' },
    ]);
    expect(result.saved).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});
