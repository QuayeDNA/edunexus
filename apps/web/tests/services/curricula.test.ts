import { vi, describe, it, expect } from 'vitest'
import { listCurricula, getCurriculum, createCurriculum, updateCurriculum, deleteCurriculum, setCurriculumSubjects } from '@/services/curricula'
import { NotFoundError, ConflictError } from '@/lib/api/errors'

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  }
}

const schoolId = 'school-1'
const mockCurriculum = {
  id: 'cur-1', schoolId, code: 'SCI', name: 'General Science',
  description: null, createdAt: new Date(), updatedAt: new Date(),
}

describe('CurriculumService', () => {
  describe('listCurricula', () => {
    it('returns curricula with subject count', async () => {
      const mockDb = createMockDb()
      mockDb.orderBy.mockResolvedValue([{ ...mockCurriculum, subjectCount: 3 }])
      const result = await listCurricula({ db: mockDb, schoolId })
      expect(result).toHaveLength(1)
      expect(result[0].subjectCount).toBe(3)
    })
  })

  describe('getCurriculum', () => {
    it('returns curriculum with subjects', async () => {
      const mockDb = createMockDb()
      mockDb.limit.mockResolvedValue([mockCurriculum])
      mockDb.orderBy.mockResolvedValue([{ id: 'sub-1', code: 'PHY', name: 'Physics' }])
      const result = await getCurriculum({ db: mockDb, schoolId }, 'cur-1')
      expect(result.code).toBe('SCI')
      expect(result.subjects).toHaveLength(1)
    })
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb()
      mockDb.limit.mockResolvedValue([])
      await expect(getCurriculum({ db: mockDb, schoolId }, 'bad')).rejects.toThrow(NotFoundError)
    })
  })

  describe('createCurriculum', () => {
    it('creates a curriculum', async () => {
      const mockDb = createMockDb()
      mockDb.limit.mockResolvedValue([])
      mockDb.returning.mockResolvedValue([mockCurriculum])
      const result = await createCurriculum({ db: mockDb, schoolId }, { code: 'SCI', name: 'General Science' })
      expect(result.id).toBe('cur-1')
    })
    it('rejects duplicate code', async () => {
      const mockDb = createMockDb()
      mockDb.limit.mockResolvedValue([mockCurriculum])
      await expect(createCurriculum({ db: mockDb, schoolId }, { code: 'SCI', name: 'General Science' })).rejects.toThrow(ConflictError)
    })
  })

  describe('updateCurriculum', () => {
    it('updates a curriculum name', async () => {
      const mockDb = createMockDb()
      mockDb.limit.mockResolvedValueOnce([mockCurriculum])
      mockDb.returning.mockResolvedValue([{ ...mockCurriculum, name: 'Advanced Science' }])
      const result = await updateCurriculum({ db: mockDb, schoolId }, 'cur-1', { name: 'Advanced Science' })
      expect(result.name).toBe('Advanced Science')
    })
  })

  describe('deleteCurriculum', () => {
    it('deletes a curriculum with no subjects', async () => {
      const mockDb = createMockDb()
      mockDb.where.mockImplementationOnce(() => mockDb)
      mockDb.limit.mockResolvedValueOnce([mockCurriculum])
      mockDb.where.mockImplementationOnce(() => Promise.resolve([{ count: '0' }]))
      mockDb.returning.mockResolvedValue([{ id: 'cur-1' }])
      const result = await deleteCurriculum({ db: mockDb, schoolId }, 'cur-1')
      expect(result.deleted).toBe(true)
    })
    it('rejects if subjects are assigned', async () => {
      const mockDb = createMockDb()
      mockDb.where.mockImplementationOnce(() => mockDb)
      mockDb.limit.mockResolvedValueOnce([mockCurriculum])
      mockDb.where.mockImplementationOnce(() => Promise.resolve([{ count: '2' }]))
      await expect(deleteCurriculum({ db: mockDb, schoolId }, 'cur-1')).rejects.toThrow(ConflictError)
    })
  })

  describe('setCurriculumSubjects', () => {
    it('replaces subjects in a transaction', async () => {
      const mockDb = createMockDb()
      mockDb.limit.mockResolvedValueOnce([mockCurriculum])
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockDb))
      mockDb.limit.mockResolvedValue([mockCurriculum])
      mockDb.orderBy.mockResolvedValue([])
      const result = await setCurriculumSubjects({ db: mockDb, schoolId }, 'cur-1', ['sub-1'])
      expect(result.code).toBe('SCI')
    })
  })
})
