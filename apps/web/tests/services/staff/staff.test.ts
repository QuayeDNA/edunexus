import { vi, describe, it, expect } from 'vitest';
import { listStaff, getStaff, createStaff, deactivateStaff } from '@/services/staff/staff';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

vi.mock('@edunexus/database', () => {
  const mockTable = { id: 'id', schoolId: 'school_id', deletedAt: 'deleted_at', firstName: 'first_name', lastName: 'last_name', staffIdNumber: 'staff_id_number', status: 'status', department: 'department', role: 'role' };
  return { staff: mockTable, profiles: mockTable, employmentContracts: mockTable };
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
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
}

const schoolId = 'school-1';
const mockStaff = {
  id: 's-1', schoolId, staffIdNumber: 'STF001', firstName: 'John', lastName: 'Doe',
  gender: 'male', dateOfBirth: '1990-01-01', phone: '0551234567', role: 'teacher',
  employmentStatus: 'permanent', dateHired: '2024-09-01', status: 'active',
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
};

describe('StaffService', () => {
  describe('listStaff', () => {
    it('returns staff ordered by name', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockStaff]);
      const result = await listStaff({ db: mockDb, schoolId });
      expect(result).toHaveLength(1);
    });
  });

  describe('getStaff', () => {
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getStaff({ db: mockDb, schoolId }, 'bad')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createStaff', () => {
    it('rejects duplicate staff ID', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockStaff]);
      await expect(createStaff({ db: mockDb, schoolId }, {} as any)).rejects.toThrow(ConflictError);
    });
  });

  describe('deactivateStaff', () => {
    it('deactivates a staff member', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockStaff]);
      mockDb.returning.mockResolvedValue([{ ...mockStaff, status: 'inactive' }]);
      const result = await deactivateStaff({ db: mockDb, schoolId }, 's-1');
      expect(result.status).toBe('inactive');
    });
  });
});
