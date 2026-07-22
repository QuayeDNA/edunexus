import { vi, describe, it, expect } from 'vitest';
import { getMatrix, saveMatrix, detectConflicts } from '@/services/class-subject-teacher/class-subject-teacher';

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
    mockDb.where = vi.fn()
      .mockImplementationOnce(() => mockDb) // validateTeacher: return this for chaining
      .mockResolvedValueOnce([]); // detectConflicts: resolve with empty rows
    const result = await saveMatrix({ db: mockDb, schoolId }, 'gl-1', [
      { classId: 'c-1', subjectId: 's-1', teacherId: 't-1' },
    ]);
    expect(result.saved).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.conflicts).toEqual([]);
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
    mockDb.where = vi.fn()
      .mockImplementationOnce(() => mockDb) // validateTeacher: return this for chaining
      .mockResolvedValueOnce([]); // detectConflicts: resolve with empty rows
    const result = await saveMatrix({ db: mockDb, schoolId }, 'gl-1', [
      { classId: 'c-1', subjectId: 's-1', teacherId: 'bad-id' },
    ]);
    expect(result.saved).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.conflicts).toEqual([]);
  });
});

describe('detectConflicts', () => {
  it('returns empty array when no conflicts exist', async () => {
    const mockDb = createMockDb();
    const rows = [
      { teacherId: 't-1', classId: 'c-1', subjectId: 's-1', className: 'Class A', gradeLevelId: 'gl-1', gradeLevelName: 'Grade 1', subjectName: 'Math' },
      { teacherId: 't-2', classId: 'c-1', subjectId: 's-2', className: 'Class A', gradeLevelId: 'gl-1', gradeLevelName: 'Grade 1', subjectName: 'English' },
    ];
    const teachers = [
      { id: 't-1', firstName: 'John', lastName: 'Doe' },
      { id: 't-2', firstName: 'Jane', lastName: 'Smith' },
    ];
    mockDb.where = vi.fn()
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(teachers);

    const result = await detectConflicts({ db: mockDb, schoolId });
    expect(result).toHaveLength(0);
  });

  it('detects same teacher assigned twice in the same grade', async () => {
    const mockDb = createMockDb();
    const rows = [
      { teacherId: 't-1', classId: 'c-1', subjectId: 's-1', className: 'Class A', gradeLevelId: 'gl-1', gradeLevelName: 'Grade 1', subjectName: 'Math' },
      { teacherId: 't-1', classId: 'c-2', subjectId: 's-2', className: 'Class B', gradeLevelId: 'gl-1', gradeLevelName: 'Grade 1', subjectName: 'English' },
    ];
    const teachers = [
      { id: 't-1', firstName: 'John', lastName: 'Doe' },
    ];
    mockDb.where = vi.fn()
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(teachers);

    const result = await detectConflicts({ db: mockDb, schoolId });
    expect(result).toHaveLength(1);
    expect(result[0].teacherId).toBe('t-1');
    expect(result[0].teacherName).toBe('John Doe');
    expect(result[0].assignments).toHaveLength(2);
    expect(result[0].assignments[0].className).toBe('Class A');
    expect(result[0].assignments[1].className).toBe('Class B');
  });

  it('does not flag same teacher across different grades', async () => {
    const mockDb = createMockDb();
    const rows = [
      { teacherId: 't-1', classId: 'c-1', subjectId: 's-1', className: 'Class A', gradeLevelId: 'gl-1', gradeLevelName: 'Grade 1', subjectName: 'Math' },
      { teacherId: 't-1', classId: 'c-3', subjectId: 's-1', className: 'Class A', gradeLevelId: 'gl-2', gradeLevelName: 'Grade 2', subjectName: 'Math' },
    ];
    const teachers = [
      { id: 't-1', firstName: 'John', lastName: 'Doe' },
    ];
    mockDb.where = vi.fn()
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(teachers);

    const result = await detectConflicts({ db: mockDb, schoolId });
    expect(result).toHaveLength(0);
  });

  it('handles empty assignments', async () => {
    const mockDb = createMockDb();
    mockDb.where = vi.fn().mockResolvedValueOnce([]);

    const result = await detectConflicts({ db: mockDb, schoolId });
    expect(result).toHaveLength(0);
  });

  it('returns conflicts when force=true is passed to saveMatrix', async () => {
    const mockDb = createMockDb();
    mockDb.limit = vi.fn().mockResolvedValue([{ id: 't-1' }]);
    mockDb.transaction = vi.fn((cb: any) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    }));

    const result = await saveMatrix({ db: mockDb, schoolId }, 'gl-1', [
      { classId: 'c-1', subjectId: 's-1', teacherId: 't-1' },
    ], undefined, true);

    expect(result.conflicts).toHaveLength(0);
  });

  it('does not flag conflict when same teacher is in different academic years', async () => {
    const mockDb = createMockDb();
    const rows = [
      { teacherId: 't-1', classId: 'c-1', subjectId: 's-1', className: 'Class A', gradeLevelId: 'gl-1', gradeLevelName: 'Grade 1', subjectName: 'Math' },
    ];
    const teachers = [
      { id: 't-1', firstName: 'John', lastName: 'Doe' },
    ];
    mockDb.where = vi.fn()
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(teachers);

    const result = await detectConflicts({ db: mockDb, schoolId }, 'ay-2');
    expect(result).toHaveLength(0);
  });
});
