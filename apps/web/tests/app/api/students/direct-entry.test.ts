import { describe, it, expect, vi, beforeEach } from 'vitest';

const classId = '00000000-0000-0000-0000-000000000002';
const academicYearId = '00000000-0000-0000-0000-000000000003';
const schoolId = '656342ad-5a0f-4b90-8362-666675e91fbe';

const mockDb: Record<string, ReturnType<typeof vi.fn>> = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/services/student-creation', () => ({
  createStudentFromData: vi.fn().mockResolvedValue({
    student: { id: 'student-1', studentIdNumber: 'AABS20260001', firstName: 'John', lastName: 'Doe' },
    enrollment: { id: 'enrollment-1' },
    guardian: { id: 'guardian-1' },
    credentials: { student: { email: 'student@school.com', password: 'password123' } },
  }),
}));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null, user: { id: 'admin-1', role: 'admin' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId }),
}));

const { POST } = await import('@/app/api/students/route');

describe('POST /api/students', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a student with valid data', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: academicYearId, isCurrent: true, schoolId }])
      .mockResolvedValueOnce([{ id: classId, schoolId, gradeLevelId: '00000000-0000-0000-0000-000000000001' }])
      .mockResolvedValueOnce([{ id: schoolId, code: 'AABS', name: 'Test School' }]);

    const res = await POST(new Request('http://localhost:3000/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({
        firstName: 'John', lastName: 'Doe', gender: 'male', dateOfBirth: '2015-06-01',
        classId, guardianName: 'Jane Doe', guardianPhone: '0205516734',
      }),
    }) as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.student.studentIdNumber).toBe('AABS20260001');
  });

  it('returns 422 for missing fields', async () => {
    const res = await POST(new Request('http://localhost:3000/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({ firstName: 'John' }),
    }) as any);

    expect(res.status).toBe(422);
  });

  it('returns 404 if class not found', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: academicYearId, isCurrent: true, schoolId }])
      .mockResolvedValueOnce([]);

    const res = await POST(new Request('http://localhost:3000/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({
        firstName: 'John', lastName: 'Doe', gender: 'male', dateOfBirth: '2015-06-01',
        classId, guardianName: 'Jane Doe', guardianPhone: '0205516734',
      }),
    }) as any);

    expect(res.status).toBe(404);
  });
});
