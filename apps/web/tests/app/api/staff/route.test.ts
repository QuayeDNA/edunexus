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
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

const { GET, POST } = await import('@/app/api/staff/route');

describe('GET /api/staff', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns staff list', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 's-1', firstName: 'John', schoolId }]);
    const req = new NextRequest('http://localhost/api/staff');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('POST /api/staff', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns 422 for invalid data', async () => {
    const req = new NextRequest('http://localhost/api/staff', { method: 'POST', body: JSON.stringify({}) });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
