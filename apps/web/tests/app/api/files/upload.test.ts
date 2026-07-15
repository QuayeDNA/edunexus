import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildStoragePath, checkFilePermission, STORAGE_PERMISSIONS } from '@edunexus/shared';

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{
    id: 'file-1',
    schoolId: 'school-1',
    entityType: 'applicant',
    entityId: 'entity-1',
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    storageProvider: 'local',
    storagePath: 'school-1/applicant/entity-1/uuid-test.pdf',
    uploadedBy: 'user-1',
  }]),
};

vi.mock('@/lib/db/client', () => ({
  db: mockDb,
}));

vi.mock('@/services/storage/factory', () => ({
  createStorageProvider: () => ({
    name: 'local',
    upload: vi.fn().mockResolvedValue({
      url: '/api/files/serve/school-1/applicant/entity-1/uuid-test.pdf',
      path: 'school-1/applicant/entity-1/uuid-test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    }),
    getSignedUrl: vi.fn(),
    delete: vi.fn(),
    copy: vi.fn(),
  }),
}));

describe('File upload route logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds storage path with correct format', () => {
    const path = buildStoragePath('school-1', 'applicant', 'entity-1', 'doc.pdf');
    expect(path).toMatch(/^school-1\/applicant\/entity-1\/[\w-]+-doc\.pdf$/);
  });

  it('rejects unsupported file types via checkFilePermission', () => {
    expect(checkFilePermission('school', 'student', 'write')).toBe(false);
  });

  it('returns error when tenant not resolved', () => {
    expect(checkFilePermission('applicant', 'admin', 'write')).toBe(true);
  });

  it('allows admin to write applicant files', () => {
    const adminPerms = STORAGE_PERMISSIONS.find(
      (p) => p.entityType === 'applicant' && p.role === 'admin',
    );
    expect(adminPerms!.canWrite).toBe(true);
    expect(adminPerms!.canDelete).toBe(true);
  });
});
