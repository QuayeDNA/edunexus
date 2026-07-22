import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'admin', schoolId, email: 'a@b.com', name: 'A' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({ resolveTenant: vi.fn().mockResolvedValue({ schoolId }) }));
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
  return { db: mockDb };
});

const { GET, POST } = await import('@/app/api/staff/[id]/contracts/route');

describe('GET /api/staff/[id]/contracts', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns contracts for staff', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([{ id: 's-1' }]);
    db.orderBy.mockResolvedValue([{ id: 'c-1', type: 'permanent', schoolId }]);
    const req = new NextRequest('http://localhost/api/staff/s-1/contracts');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req, { params: Promise.resolve({ id: 's-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
