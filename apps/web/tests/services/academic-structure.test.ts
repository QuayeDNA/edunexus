import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  createAcademicYear, updateAcademicYear, deleteAcademicYear,
  setCurrentAcademicYear, listAcademicYears, getAcademicYear,
  createTerm, updateTerm, deleteTerm, toggleTermLock,
  setCurrentTerm, listTerms, getTerm,
} from '@/services/academic-structure';
import { AppError } from '@/lib/api/errors';

const schoolId = 'school-1';

const mockYear = {
  id: 'year-1', schoolId, name: '2024/2025',
  startDate: new Date('2024-09-09'), endDate: new Date('2025-07-18'),
  isCurrent: false, createdAt: new Date(), updatedAt: new Date(),
};

const mockCurrentYear = {
  ...mockYear, id: 'year-2', name: '2025/2026',
  startDate: new Date('2025-09-08'), endDate: new Date('2026-07-17'),
  isCurrent: true,
};

const mockTerm = {
  id: 'term-1', schoolId, academicYearId: 'year-1',
  termNumber: '1', name: 'First Term',
  startDate: new Date('2024-09-09'), endDate: new Date('2024-12-13'),
  isCurrent: true, locked: false, createdAt: new Date(), updatedAt: new Date(),
};



function createMockDb(): any {
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

  describe('listAcademicYears', () => {
    it('returns all years for the school', async () => {
      mockDb.orderBy.mockResolvedValue([mockYear]);
      const mockDb2 = createMockDb();
      mockDb2.orderBy.mockResolvedValue([mockYear]);

      const result = await listAcademicYears({ db: mockDb2, schoolId }, false);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('2024/2025');
    });
  });

  describe('getAcademicYear', () => {
    it('returns year with terms', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValueOnce([mockYear]);
      mockDb2.orderBy.mockResolvedValueOnce([mockTerm]);

      const result = await getAcademicYear({ db: mockDb2, schoolId }, 'year-1');

      expect(result.id).toBe('year-1');
      expect(result.terms).toHaveLength(1);
    });

    it('throws 404 if year not found', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([]);

      await expect(getAcademicYear({ db: mockDb2, schoolId }, 'missing')).rejects.toThrow(AppError);
    });
  });

  describe('updateAcademicYear', () => {
    it('updates year name', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([{ ...mockYear, isCurrent: false }]);
      mockDb2.returning.mockResolvedValue([{ ...mockYear, name: '2025/2026' }]);

      const result = await updateAcademicYear({ db: mockDb2, schoolId }, 'year-1', { name: '2025/2026' });

      expect(result.name).toBe('2025/2026');
    });

    it('rejects start date after end date', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([mockYear]);

      await expect(updateAcademicYear({ db: mockDb2, schoolId }, 'year-1', { startDate: '2026-01-01', endDate: '2025-01-01' }))
        .rejects.toThrow(AppError);
    });

    it('rejects rollback when setting isCurrent via PATCH', async () => {
      const mockDb2 = createMockDb();
      const earlierYear = { ...mockYear, startDate: new Date('2023-09-04') };
      mockDb2.limit
        .mockResolvedValueOnce([earlierYear])
        .mockResolvedValueOnce([mockCurrentYear]);

      await expect(updateAcademicYear({ db: mockDb2, schoolId }, 'year-1', { isCurrent: true }))
        .rejects.toThrow(AppError);
    });

    it('locks old year terms when setting isCurrent via PATCH', async () => {
      const mockDb2 = createMockDb();
      const nextYear = { ...mockYear, id: 'year-3', name: '2026/2027', startDate: new Date('2026-09-07'), isCurrent: false };
      mockDb2.limit
        .mockResolvedValueOnce([nextYear])
        .mockResolvedValueOnce([mockCurrentYear]);
      mockDb2.returning.mockResolvedValue([{ ...nextYear, isCurrent: true }]);

      const result = await updateAcademicYear({ db: mockDb2, schoolId }, 'year-3', { isCurrent: true });

      expect(result.isCurrent).toBe(true);
      expect(mockDb2.update).toHaveBeenCalled();
    });

    it('throws 404 if year not found', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([]);
      mockDb2.returning.mockResolvedValue([]);

      await expect(updateAcademicYear({ db: mockDb2, schoolId }, 'missing', { name: 'Test' }))
        .rejects.toThrow(AppError);
    });
  });

  describe('setCurrentAcademicYear', () => {
    it('unsets all years then sets target in a transaction', async () => {
      const nextYear = { ...mockYear, id: 'year-3', name: '2026/2027', startDate: new Date('2026-09-07'), isCurrent: false };
      mockDb.limit
        .mockResolvedValueOnce([nextYear])
        .mockResolvedValueOnce([mockCurrentYear]);
      mockDb.returning.mockResolvedValue([nextYear]);

      const result = await setCurrentAcademicYear(ctx, 'year-3');

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(result.isCurrent).toBe(true);
    });

    it('returns early if year is already current', async () => {
      mockDb.limit
        .mockResolvedValueOnce([mockCurrentYear])
        .mockResolvedValueOnce([mockCurrentYear]);

      const result = await setCurrentAcademicYear(ctx, 'year-2');

      expect(mockDb.transaction).not.toHaveBeenCalled();
      expect(result.isCurrent).toBe(true);
    });

    it('rejects rollback to an earlier academic year', async () => {
      const earlierYear = { ...mockYear, id: 'year-0', name: '2023/2024', startDate: new Date('2023-09-04') };
      mockDb.limit
        .mockResolvedValueOnce([earlierYear])
        .mockResolvedValueOnce([mockCurrentYear]);

      await expect(setCurrentAcademicYear(ctx, 'year-0')).rejects.toThrow(AppError);
    });

    it('auto-locks old current year terms in transaction', async () => {
      const nextYear = { ...mockYear, id: 'year-3', name: '2026/2027', startDate: new Date('2026-09-07'), isCurrent: false };
      mockDb.limit
        .mockResolvedValueOnce([nextYear])
        .mockResolvedValueOnce([mockCurrentYear]);

      const tx = createMockDb();
      tx.select = vi.fn().mockReturnThis();
      tx.from = vi.fn().mockReturnThis();
      tx.where = vi.fn().mockReturnThis();
      tx.limit = vi.fn().mockReturnThis();
      tx.update = vi.fn().mockReturnThis();
      tx.set = vi.fn().mockReturnThis();
      tx.where = vi.fn().mockReturnThis();
      tx.select.mockReturnThis();
      tx.from.mockReturnThis();
      tx.limit.mockResolvedValue([{ id: 'term-1' }, { id: 'term-2' }]);
      mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

      await setCurrentAcademicYear(ctx, 'year-1');

      expect(tx.update).toHaveBeenCalledWith(expect.anything());
      const setCall = tx.set.mock.calls.find((c: any) => c[0]?.locked === true);
      expect(setCall).toBeDefined();
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
        startDate: '2024-09-09', endDate: '2024-12-13', isCurrent: false,
      });

      expect(result.name).toBe('First Term');
      expect(result.locked).toBe(false);
    });

    it('rejects term dates outside year range', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValueOnce([mockYear]);

      await expect(createTerm({ db: mockDb2, schoolId }, {
        academicYearId: 'year-1', termNumber: '1', name: 'Bad',
        startDate: '2025-09-09', endDate: '2025-12-13', isCurrent: false,
      })).rejects.toThrow(AppError);
    });
  });

  describe('updateTerm', () => {
    it('updates term name', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValueOnce([mockTerm]);
      mockDb2.returning.mockResolvedValue([{ ...mockTerm, name: 'Renamed' }]);

      const result = await updateTerm({ db: mockDb2, schoolId }, 'term-1', { name: 'Renamed' });

      expect(result.name).toBe('Renamed');
    });

    it('rejects editing a locked term', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([{ ...mockTerm, locked: true }]);

      await expect(updateTerm({ db: mockDb2, schoolId }, 'term-1', { name: 'Hack' }))
        .rejects.toThrow(AppError);
    });

    it('throws 404 if term not found', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([]);

      await expect(updateTerm({ db: mockDb2, schoolId }, 'missing', { name: 'Test' }))
        .rejects.toThrow(AppError);
    });
  });

  describe('deleteTerm', () => {
    it('deletes an existing term', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValueOnce([mockTerm]);
      mockDb2.returning.mockResolvedValue([{ id: 'term-1' }]);

      const result = await deleteTerm({ db: mockDb2, schoolId }, 'term-1');

      expect(result.deleted).toBe(true);
    });

    it('rejects deleting a locked term', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([{ ...mockTerm, locked: true }]);

      await expect(deleteTerm({ db: mockDb2, schoolId }, 'term-1')).rejects.toThrow(AppError);
    });

    it('throws 404 if term not found', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([]);

      await expect(deleteTerm({ db: mockDb2, schoolId }, 'missing')).rejects.toThrow(AppError);
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
      mockDb.limit
        .mockResolvedValueOnce([mockTerm])
        .mockResolvedValueOnce([{ isCurrent: true }]);

      const result = await setCurrentTerm(ctx, 'term-1');

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(result.isCurrent).toBe(true);
    });

    it('rejects if academic year is not current', async () => {
      mockDb.limit
        .mockResolvedValueOnce([mockTerm])
        .mockResolvedValueOnce([{ isCurrent: false }]);

      await expect(setCurrentTerm(ctx, 'term-1')).rejects.toThrow(AppError);
    });

    it('throws 404 if term not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(setCurrentTerm(ctx, 'missing')).rejects.toThrow(AppError);
    });
  });

  describe('listTerms', () => {
    it('returns terms for an academic year', async () => {
      const mockDb2 = createMockDb();
      mockDb2.orderBy.mockResolvedValue([mockTerm]);

      const result = await listTerms({ db: mockDb2, schoolId }, 'year-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('First Term');
    });
  });

  describe('getTerm', () => {
    it('returns a single term', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([mockTerm]);

      const result = await getTerm({ db: mockDb2, schoolId }, 'term-1');

      expect(result.id).toBe('term-1');
    });

    it('throws 404 if term not found', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValue([]);

      await expect(getTerm({ db: mockDb2, schoolId }, 'missing')).rejects.toThrow(AppError);
    });
  });
});
