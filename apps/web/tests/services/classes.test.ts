import { vi, describe, it, expect } from 'vitest';
import { listClasses, getClass, createClass, updateClass, deleteClass } from '@/services/classes';
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
const mockClass = {
  id: 'c-1',
  schoolId,
  name: 'Class 1A',
  code: 'P1-A',
  gradeLevelId: 'gl-1',
  academicYearId: 'ay-1',
  homeroomTeacherId: null,
  capacity: 40,
  roomNumber: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  deletedAt: null,
};

describe('ClassService', () => {
  describe('listClasses', () => {
    it('returns classes for a grade level with grade level name', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([
        { ...mockClass, gradeLevelName: 'Primary 1' },
      ]);
      const result = await listClasses({ db: mockDb, schoolId }, 'gl-1');
      expect(result).toHaveLength(1);
      expect(result[0].gradeLevelName).toBe('Primary 1');
    });
  });

  describe('getClass', () => {
    it('returns a single class', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ ...mockClass, gradeLevelName: 'Primary 1' }]);
      const result = await getClass({ db: mockDb, schoolId }, 'c-1');
      expect(result.id).toBe('c-1');
    });

    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getClass({ db: mockDb, schoolId }, 'missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createClass', () => {
    it('creates a class with valid data', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'gl-1' }])
        .mockResolvedValueOnce([{ id: 'ay-1' }])
        .mockResolvedValueOnce([]);
      mockDb.returning.mockResolvedValue([mockClass]);
      const result = await createClass({ db: mockDb, schoolId }, {
        name: 'Class 1A', gradeLevelId: 'gl-1', academicYearId: 'ay-1',
      });
      expect(result.id).toBe('c-1');
    });

    it('rejects duplicate name within grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'gl-1' }])
        .mockResolvedValueOnce([{ id: 'ay-1' }])
        .mockResolvedValueOnce([mockClass]);
      await expect(createClass({ db: mockDb, schoolId }, {
        name: 'Class 1A', gradeLevelId: 'gl-1', academicYearId: 'ay-1',
      })).rejects.toThrow(ConflictError);
    });

    it('rejects invalid grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([]);
      await expect(createClass({ db: mockDb, schoolId }, {
        name: 'Bad', gradeLevelId: 'bad-gl', academicYearId: 'ay-1',
      })).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateClass', () => {
    it('updates a class name', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([mockClass])
        .mockResolvedValueOnce([{ id: 'gl-1' }])
        .mockResolvedValueOnce([{ id: 'ay-1' }])
        .mockResolvedValueOnce([]);
      mockDb.returning.mockResolvedValue([{ ...mockClass, name: 'Updated' }]);
      const result = await updateClass({ db: mockDb, schoolId }, 'c-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteClass', () => {
    it('soft deletes a class', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockClass]);
      mockDb.returning.mockResolvedValue([{ id: 'c-1' }]);
      const result = await deleteClass({ db: mockDb, schoolId }, 'c-1');
      expect(result.deleted).toBe(true);
    });

    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(deleteClass({ db: mockDb, schoolId }, 'missing')).rejects.toThrow(NotFoundError);
    });
  });
});
