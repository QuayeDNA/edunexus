import { vi, describe, it, expect } from 'vitest';
import { listContracts, createContract } from '@/services/staff/employment-contracts';
import { NotFoundError } from '@/lib/api/errors';

vi.mock('@edunexus/database', () => {
  const mockTable = { id: 'id', schoolId: 'school_id', deletedAt: 'deleted_at', firstName: 'first_name', lastName: 'last_name', staffIdNumber: 'staff_id_number', status: 'status' };
  return { staff: mockTable, employmentContracts: mockTable };
});

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
}

const schoolId = 'school-1';

describe('ContractService', () => {
  describe('createContract', () => {
    it('creates a contract for existing staff', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([{ id: 's-1' }]);
      mockDb.returning.mockResolvedValue([{ id: 'c-1', type: 'permanent', staffId: 's-1', schoolId }]);
      const result = await createContract({ db: mockDb, schoolId }, 's-1', { type: 'permanent', startDate: '2024-09-01' });
      expect(result.id).toBe('c-1');
    });
    it('throws 404 if staff not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(createContract({ db: mockDb, schoolId }, 'bad', { type: 'permanent', startDate: '2024-09-01' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('listContracts', () => {
    it('lists contracts for existing staff', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([{ id: 's-1' }]);
      mockDb.orderBy.mockResolvedValue([{ id: 'c-1', type: 'permanent', schoolId }]);
      const result = await listContracts({ db: mockDb, schoolId }, 's-1');
      expect(result).toHaveLength(1);
    });
  });
});
