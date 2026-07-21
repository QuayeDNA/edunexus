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
  code: 'P1A',
  gradeLevelId: 'gl-1',
  academicYearId: 'ay-1',
  homeroomTeacherId: null,
  capacity: 40,
  roomNumber: '101',
  gradeLevelName: 'Primary 1',
};

describe('ClassService', () => {
  describe('listClasses', () => {
    it('returns classes for a grade level', async () => {
      const mockDb = createMockDb();
      (mockDb as any).orderBy.mockResolvedValue([mockClass, { ...mockClass, id: 'c-2', name: 'Class 1B' }]);
      const result = await listClasses({ db: mockDb as any, schoolId }, 'gl-1');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Class 1A');
    });
  });

  describe('getClass', () => {
    it('returns a class by id', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit.mockResolvedValue([mockClass]);
      const result = await getClass({ db: mockDb as any, schoolId }, 'c-1');
      expect(result.id).toBe('c-1');
    });

    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit.mockResolvedValue([]);
      await expect(getClass({ db: mockDb as any, schoolId }, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createClass', () => {
    it('creates a class', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit
        .mockResolvedValueOnce([{ id: 'gl-1' }])   // validateClassRefs: gradeLevel
        .mockResolvedValueOnce([{ id: 'ay-1' }])   // validateClassRefs: academicYear
        .mockResolvedValue([]);                     // duplicate check: none
      (mockDb as any).returning.mockResolvedValue([mockClass]);
      const result = await createClass({ db: mockDb as any, schoolId }, {
        name: 'Class 1A', gradeLevelId: 'gl-1', academicYearId: 'ay-1',
      });
      expect(result.id).toBe('c-1');
    });

    it('rejects duplicate name in same grade level', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit
        .mockResolvedValueOnce([{ id: 'gl-1' }])   // validateClassRefs: gradeLevel
        .mockResolvedValueOnce([{ id: 'ay-1' }])   // validateClassRefs: academicYear
        .mockResolvedValue([mockClass]);            // duplicate check: conflict
      await expect(createClass({ db: mockDb as any, schoolId }, {
        name: 'Class 1A', gradeLevelId: 'gl-1', academicYearId: 'ay-1',
      })).rejects.toThrow(ConflictError);
    });

    it('rejects invalid gradeLevelId', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit
        .mockResolvedValueOnce([])                   // validateClassRefs: gradeLevel not found
        .mockResolvedValue([{ id: 'ay-1' }]);
      await expect(createClass({ db: mockDb as any, schoolId }, {
        name: 'Class 1A', gradeLevelId: 'invalid-gl', academicYearId: 'ay-1',
      })).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateClass', () => {
    it('updates a class name', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit
        .mockResolvedValueOnce([mockClass])          // get existing class
        .mockResolvedValueOnce([{ id: 'gl-1' }])    // validateClassRefs: gradeLevel
        .mockResolvedValueOnce([{ id: 'ay-1' }])    // validateClassRefs: academicYear
        .mockResolvedValue([]);                      // duplicate name check: none
      (mockDb as any).returning.mockResolvedValue([{ ...mockClass, name: 'Class 1A Updated' }]);
      const result = await updateClass({ db: mockDb as any, schoolId }, 'c-1', { name: 'Class 1A Updated' });
      expect(result.name).toBe('Class 1A Updated');
    });

    it('rejects changing to a duplicate name', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit
        .mockResolvedValueOnce([mockClass])          // get existing class
        .mockResolvedValueOnce([{ id: 'gl-1' }])    // validateClassRefs: gradeLevel
        .mockResolvedValueOnce([{ id: 'ay-1' }])    // validateClassRefs: academicYear
        .mockResolvedValue([{ id: 'c-2', name: 'Class 1B' }]); // duplicate name check: conflict
      await expect(updateClass({ db: mockDb as any, schoolId }, 'c-1', { name: 'Class 1B' })).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteClass', () => {
    it('soft-deletes a class', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit.mockResolvedValue([mockClass]);
      (mockDb as any).returning.mockResolvedValue([{ id: 'c-1' }]);
      const result = await deleteClass({ db: mockDb as any, schoolId }, 'c-1');
      expect(result.deleted).toBe(true);
    });

    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      (mockDb as any).limit.mockResolvedValue([]);
      await expect(deleteClass({ db: mockDb as any, schoolId }, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
