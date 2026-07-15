import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkFilePermission } from '@edunexus/shared';

const mockRecord = {
  id: 'file-1',
  schoolId: 'school-1',
  entityType: 'student',
  entityId: 'entity-1',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  size: 50000,
  storageProvider: 'local',
  storagePath: 'school-1/student/entity-1/uuid-photo.jpg',
  checksum: null,
  uploadedBy: 'user-1',
  createdAt: new Date(),
  deletedAt: null,
};

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([mockRecord]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db/client', () => ({
  db: mockDb,
}));

vi.mock('@/services/storage/factory', () => ({
  createStorageProvider: () => ({
    name: 'local',
    upload: vi.fn(),
    getSignedUrl: vi.fn().mockResolvedValue('/signed-url/photo.jpg'),
    delete: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn(),
  }),
}));

describe('File metadata and download routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks read permission before returning file metadata', () => {
    expect(checkFilePermission('student', 'teacher', 'read')).toBe(true);
    expect(checkFilePermission('student', 'applicant', 'read')).toBe(false);
  });

  it('soft-deletes and removes from storage on delete', async () => {
    const { createStorageProvider } = await import('@/services/storage/factory');
    const provider = createStorageProvider();
    await provider.delete('school-1/student/entity-1/uuid-photo.jpg');
    expect(provider.delete).toHaveBeenCalledWith('school-1/student/entity-1/uuid-photo.jpg');
  });

  it('allows admin to delete student files', () => {
    expect(checkFilePermission('student', 'admin', 'delete')).toBe(true);
  });

  it('denies teacher from deleting student files', () => {
    expect(checkFilePermission('student', 'teacher', 'delete')).toBe(false);
  });
});
