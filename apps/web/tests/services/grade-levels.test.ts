import { vi, describe, it, expect, beforeEach } from 'vitest';
import { listGradeLevels, getGradeLevel, createGradeLevel, updateGradeLevel, deleteGradeLevel } from '@/services/grade-levels';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

vi.mock('@edunexus/database', async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
}

const schoolId = 'school-1';
const mockGradeLevel = {
  id: 'gl-1',
  schoolId,
  code: 'P1',
  name: 'Primary 1',
  level: 5,
  category: 'primary',
  description: null,
  sortOrder: 5,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('GradeLevelService', () => {
  describe('listGradeLevels', () => {
    it('returns ordered grade levels with class count', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([
        { ...mockGradeLevel, classCount: 2 },
        { ...mockGradeLevel, id: 'gl-2', code: 'P2', name: 'Primary 2', level: 6, sortOrder: 6, classCount: 1 },
      ]);
      const result = await listGradeLevels({ db: mockDb, schoolId });
      expect(result).toHaveLength(2);
      expect(result[0].classCount).toBe(2);
    });
  });

  describe('getGradeLevel', () => {
    it('returns grade level with class count', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ ...mockGradeLevel, classCount: 2 }]);
      const result = await getGradeLevel({ db: mockDb, schoolId }, 'gl-1');
      expect(result.id).toBe('gl-1');
      expect(result.classCount).toBe(2);
    });

    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getGradeLevel({ db: mockDb, schoolId }, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createGradeLevel', () => {
    it('creates a grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      mockDb.returning.mockResolvedValue([mockGradeLevel]);
      const result = await createGradeLevel({ db: mockDb, schoolId }, {
        code: 'P1', name: 'Primary 1', level: 5, category: 'primary',
      });
      expect(result.id).toBe('gl-1');
    });

    it('rejects duplicate code', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockGradeLevel]);
      await expect(createGradeLevel({ db: mockDb, schoolId }, {
        code: 'P1', name: 'Primary 1', level: 5, category: 'primary',
      })).rejects.toThrow(ConflictError);
    });
  });

  describe('updateGradeLevel', () => {
    it('updates a grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockGradeLevel]);
      mockDb.returning.mockResolvedValue([{ ...mockGradeLevel, name: 'Primary 1 Updated' }]);
      const result = await updateGradeLevel({ db: mockDb, schoolId }, 'gl-1', { name: 'Primary 1 Updated' });
      expect(result.name).toBe('Primary 1 Updated');
    });

    it('rejects changing to an existing code', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([mockGradeLevel])
        .mockResolvedValueOnce([{ id: 'gl-2', code: 'P2' }]);
      await expect(updateGradeLevel({ db: mockDb, schoolId }, 'gl-1', { code: 'P2' })).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteGradeLevel', () => {
    it('deletes a grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([mockGradeLevel])
        .mockResolvedValueOnce([{ count: '0' }]);
      mockDb.returning.mockResolvedValue([{ id: 'gl-1' }]);
      const result = await deleteGradeLevel({ db: mockDb, schoolId }, 'gl-1');
      expect(result.deleted).toBe(true);
    });

    it('rejects if classes exist', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([mockGradeLevel])
        .mockResolvedValueOnce([{ count: '3' }]);
      await expect(deleteGradeLevel({ db: mockDb, schoolId }, 'gl-1')).rejects.toThrow(ConflictError);
    });

    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(deleteGradeLevel({ db: mockDb, schoolId }, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
