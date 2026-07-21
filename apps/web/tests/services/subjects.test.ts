import { vi, describe, it, expect } from 'vitest';
import { listSubjects, getSubject, createSubject, updateSubject, deleteSubject } from '@/services/subjects';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
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
const mockSubject = {
  id: 'sub-1', schoolId, code: 'MATH', name: 'Mathematics',
  category: 'core', description: null,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('SubjectService', () => {
  describe('listSubjects', () => {
    it('returns all subjects ordered by code', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockSubject, { ...mockSubject, id: 'sub-2', code: 'ENG', name: 'English' }]);
      const result = await listSubjects({ db: mockDb, schoolId });
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('MATH');
    });
  });

  describe('getSubject', () => {
    it('returns a single subject', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockSubject]);
      const result = await getSubject({ db: mockDb, schoolId }, 'sub-1');
      expect(result.id).toBe('sub-1');
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getSubject({ db: mockDb, schoolId }, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createSubject', () => {
    it('creates a subject', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      mockDb.returning.mockResolvedValue([mockSubject]);
      const result = await createSubject({ db: mockDb, schoolId }, { code: 'MATH', name: 'Mathematics' });
      expect(result.id).toBe('sub-1');
    });
    it('rejects duplicate code', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockSubject]);
      await expect(createSubject({ db: mockDb, schoolId }, { code: 'MATH', name: 'Mathematics' })).rejects.toThrow(ConflictError);
    });
  });

  describe('updateSubject', () => {
    it('updates a subject name', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockSubject]);
      mockDb.returning.mockResolvedValue([{ ...mockSubject, name: 'Advanced Mathematics' }]);
      const result = await updateSubject({ db: mockDb, schoolId }, 'sub-1', { name: 'Advanced Mathematics' });
      expect(result.name).toBe('Advanced Mathematics');
    });
  });

  describe('deleteSubject', () => {
    it('deletes a subject with no references', async () => {
      const mockDb = createMockDb();
      mockDb.where.mockImplementationOnce(() => mockDb);
      mockDb.limit.mockResolvedValueOnce([mockSubject]);
      mockDb.where.mockImplementationOnce(() => Promise.resolve([{ count: '0' }]));
      mockDb.where.mockImplementationOnce(() => Promise.resolve([{ count: '0' }]));
      mockDb.returning.mockResolvedValue([{ id: 'sub-1' }]);
      const result = await deleteSubject({ db: mockDb, schoolId }, 'sub-1');
      expect(result.deleted).toBe(true);
    });
    it('rejects if referenced by classSubjects', async () => {
      const mockDb = createMockDb();
      mockDb.where.mockImplementationOnce(() => mockDb);
      mockDb.limit.mockResolvedValueOnce([mockSubject]);
      mockDb.where.mockImplementationOnce(() => Promise.resolve([{ count: '3' }]));
      await expect(deleteSubject({ db: mockDb, schoolId }, 'sub-1')).rejects.toThrow(ConflictError);
    });
  });
});
