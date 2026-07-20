import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  createAcademicYear, updateAcademicYear, deleteAcademicYear,
  setCurrentAcademicYear, listAcademicYears, getAcademicYear,
  createTerm, updateTerm, deleteTerm, toggleTermLock,
  setCurrentTerm, listTerms, getTerm, AppError,
  createAcademicYearSchema, createTermSchema,
} from '@/services/academic-structure';

const schoolId = 'school-1';

const mockYear = {
  id: 'year-1', schoolId, name: '2024/2025',
  startDate: new Date('2024-09-09'), endDate: new Date('2025-07-18'),
  isCurrent: true, createdAt: new Date(), updatedAt: new Date(),
};

const mockYears = [mockYear];

const mockTerm = {
  id: 'term-1', schoolId, academicYearId: 'year-1',
  termNumber: '1', name: 'First Term',
  startDate: new Date('2024-09-09'), endDate: new Date('2024-12-13'),
  isCurrent: true, locked: false, createdAt: new Date(), updatedAt: new Date(),
};

const mockTerms = [mockTerm];

function createMockDb() {
  const txRun = vi.fn();
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
    transaction: vi.fn().mockImplementation(async (cb: any) => {
      const tx = createMockDb();
      await cb(tx);
      return tx;
    }),
  };
}

describe('AcademicStructureService', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let ctx: { db: any; schoolId: string };

  beforeEach(() => {
    mockDb = createMockDb();
    ctx = { db: mockDb, schoolId };
    vi.clearAllMocks();
  });

  describe('createAcademicYear', () => {
    it('creates a year with valid data', async () => {
      mockDb.returning.mockResolvedValue([mockYear]);
      mockDb.limit.mockResolvedValue([]);

      const result = await createAcademicYear(ctx, {
        name: '2024/2025', startDate: '2024-09-09', endDate: '2025-07-18',
        isCurrent: false, autoGenerateTerms: false, activateTerm1: false,
      });

      expect(result.name).toBe('2024/2025');
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it('rejects start date after end date', async () => {
      mockDb.returning.mockResolvedValue([mockYear]);
      mockDb.limit.mockResolvedValue([]);

      await expect(createAcademicYear(ctx, {
        name: 'Bad', startDate: '2025-01-01', endDate: '2024-01-01',
        isCurrent: false, autoGenerateTerms: false, activateTerm1: false,
      })).rejects.toThrow(AppError);
    });

    it('rejects duplicate name', async () => {
      mockDb.limit.mockResolvedValue([{ id: 'existing' }]);

      await expect(createAcademicYear(ctx, {
        name: '2024/2025', startDate: '2024-09-09', endDate: '2025-07-18',
        isCurrent: false, autoGenerateTerms: false, activateTerm1: false,
      })).rejects.toThrow(AppError);
    });
  });

  describe('setCurrentAcademicYear', () => {
    it('unsets all years then sets target in a transaction', async () => {
      mockDb.limit.mockResolvedValue([mockYear]);
      mockDb.returning.mockResolvedValue([mockYear]);

      const result = await setCurrentAcademicYear(ctx, 'year-1');

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(result.isCurrent).toBe(true);
    });

    it('throws 404 if year not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(setCurrentAcademicYear(ctx, 'missing')).rejects.toThrow(AppError);
    });
  });

  describe('deleteAcademicYear', () => {
    it('rejects if year has terms', async () => {
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: '3' }]) }) });

      ctx.db.select = vi.fn().mockReturnThis();
      ctx.db.from = vi.fn().mockReturnThis();
      ctx.db.where = vi.fn().mockResolvedValue([{ count: '3' }]);

      await expect(deleteAcademicYear(ctx, 'year-1')).rejects.toThrow(AppError);
    });
  });

  describe('createTerm', () => {
    it('creates a term within valid year range', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit
        .mockResolvedValueOnce([mockYear])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb2.returning.mockResolvedValue([mockTerm]);

      const result = await createTerm({ db: mockDb2, schoolId }, {
        academicYearId: 'year-1', termNumber: '1', name: 'First Term',
        startDate: '2024-09-09', endDate: '2024-12-13',
      });

      expect(result.name).toBe('First Term');
      expect(result.locked).toBe(false);
    });

    it('rejects term dates outside year range', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValueOnce([mockYear]);

      await expect(createTerm({ db: mockDb2, schoolId }, {
        academicYearId: 'year-1', termNumber: '1', name: 'Bad',
        startDate: '2025-09-09', endDate: '2025-12-13',
      })).rejects.toThrow(AppError);
    });
  });

  describe('toggleTermLock', () => {
    it('toggles locked from false to true', async () => {
      const unlocked = { ...mockTerm, locked: false };
      const locked = { ...mockTerm, locked: true };
      mockDb.limit.mockResolvedValue([unlocked]);
      mockDb.returning.mockResolvedValue([locked]);

      const result = await toggleTermLock(ctx, 'term-1');

      expect(result.locked).toBe(true);
    });

    it('throws 404 if term not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(toggleTermLock(ctx, 'missing')).rejects.toThrow(AppError);
    });
  });

  describe('setCurrentTerm', () => {
    it('unsets all terms in year then sets target', async () => {
      mockDb.limit.mockResolvedValue([mockTerm]);

      const result = await setCurrentTerm(ctx, 'term-1');

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(result.isCurrent).toBe(true);
    });
  });
});
