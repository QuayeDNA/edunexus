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
