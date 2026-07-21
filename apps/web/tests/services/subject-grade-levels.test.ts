import { vi, describe, it, expect } from 'vitest';
import { listGradeLevelSubjects, setGradeLevelSubjects, toggleCore } from '@/services/subject-grade-levels';
import { NotFoundError } from '@/lib/api/errors';

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
}

const schoolId = 'school-1';

describe('SubjectGradeLevelService', () => {
  describe('listGradeLevelSubjects', () => {
    it('returns subjects mapped to a grade level with subject details', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([
        { id: 'sgl-1', subjectId: 'sub-1', gradeLevelId: 'gl-1', isCore: true, subjectCode: 'MATH', subjectName: 'Mathematics', schoolId },
      ]);
      const result = await listGradeLevelSubjects({ db: mockDb, schoolId }, 'gl-1');
      expect(result).toHaveLength(1);
      expect(result[0].subjectCode).toBe('MATH');
    });
  });

  describe('setGradeLevelSubjects', () => {
    it('replaces all mappings in a transaction', async () => {
      const mockDb = createMockDb();
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockDb));
      mockDb.orderBy.mockResolvedValue([
        { id: 'sgl-1', subjectId: 'sub-1', gradeLevelId: 'gl-1', isCore: true, subjectCode: 'MATH', subjectName: 'Mathematics', schoolId },
      ]);
      const result = await setGradeLevelSubjects({ db: mockDb, schoolId }, 'gl-1', ['sub-1', 'sub-2']);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('toggleCore', () => {
    it('flips the isCore flag', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([{ id: 'sgl-1', isCore: true, schoolId }]);
      mockDb.returning.mockResolvedValue([{ id: 'sgl-1', isCore: false }]);
      const result = await toggleCore({ db: mockDb, schoolId }, 'sgl-1');
      expect(result.isCore).toBe(false);
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(toggleCore({ db: mockDb, schoolId }, 'bad-id')).rejects.toThrow(NotFoundError);
    });
  });
});
