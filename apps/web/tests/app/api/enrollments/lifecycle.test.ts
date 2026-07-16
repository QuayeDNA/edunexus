import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLifecycle = vi.fn();
vi.mock('@/services/enrollment-lifecycle', () => ({
  updateEnrollmentStatus: mockLifecycle,
}));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));

const mockGenerateCertificate = vi.fn();
vi.mock('@/services/transfer-certificate', () => ({
  generateTransferCertificate: mockGenerateCertificate,
}));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};
vi.mock('@/lib/db', () => ({ db: mockDb }));

describe('POST /api/enrollments/[id]/withdraw', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 on successful withdrawal', async () => {
    mockLifecycle.mockResolvedValue({
      id: 'e1', status: 'withdrawn', endDate: '2026-07-15', transferReason: 'Left school', transferSchoolName: null,
    });

    const { POST } = await import('@/app/api/enrollments/[id]/withdraw/route');
    const res = await POST(
      new Request('http://localhost:3000/api/enrollments/e1/withdraw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Left school' }),
      }) as any,
      { params: Promise.resolve({ id: 'e1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('withdrawn');
  });

  it('returns 422 if reason missing', async () => {
    const { POST } = await import('@/app/api/enrollments/[id]/withdraw/route');
    const res = await POST(
      new Request('http://localhost:3000/api/enrollments/e1/withdraw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as any,
      { params: Promise.resolve({ id: 'e1' }) },
    );

    expect(res.status).toBe(422);
  });
});

describe('POST /api/enrollments/[id]/graduate', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 on successful graduation', async () => {
    mockLifecycle.mockResolvedValue({
      id: 'e1', status: 'graduated', endDate: '2026-07-15', transferReason: null, transferSchoolName: null,
    });

    const { POST } = await import('@/app/api/enrollments/[id]/graduate/route');
    const res = await POST(
      new Request('http://localhost:3000/api/enrollments/e1/graduate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as any,
      { params: Promise.resolve({ id: 'e1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('graduated');
  });
});

describe('POST /api/enrollments/[id]/transfer', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with certificate info on successful transfer', async () => {
    mockLifecycle.mockResolvedValue({
      id: 'e1', status: 'transferred_out', endDate: '2026-07-15', transferReason: 'Moved to Accra Academy', transferSchoolName: 'Accra Academy',
    });
    mockDb.limit
      .mockResolvedValueOnce([{ id: 'e1', studentId: 's1', classId: 'c1' }])
      .mockResolvedValueOnce([{ id: 's1', firstName: 'John', lastName: 'Doe', studentIdNumber: 'STU001', dateOfBirth: '2010-01-01' }])
      .mockResolvedValueOnce([{ id: 'sch1', name: 'Accra Boys School' }]);
    mockGenerateCertificate.mockResolvedValue(Buffer.from('fake-pdf'));

    const { POST } = await import('@/app/api/enrollments/[id]/transfer/route');
    const res = await POST(
      new Request('http://localhost:3000/api/enrollments/e1/transfer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Moved to Accra Academy', targetSchoolName: 'Accra Academy' }),
      }) as any,
      { params: Promise.resolve({ id: 'e1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('transferred_out');
    expect(body.data.transferSchoolName).toBe('Accra Academy');
    expect(body.data.certificateSize).toBeGreaterThan(0);
  });

  it('returns 422 if targetSchoolName missing', async () => {
    const { POST } = await import('@/app/api/enrollments/[id]/transfer/route');
    const res = await POST(
      new Request('http://localhost:3000/api/enrollments/e1/transfer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Moving' }),
      }) as any,
      { params: Promise.resolve({ id: 'e1' }) },
    );

    expect(res.status).toBe(422);
  });
});
