import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'u1', role: 'admin', schoolId, email: 'a@b.com', name: 'A' },
  }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId }),
}));
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
    returning: vi.fn().mockReturnValue([{ id: 'new-id' }]),
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockDb)),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/academic-years/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/academic-years/[id]/route');
const { POST: setCurrentPOST } = await import('@/app/api/academic-years/[id]/set-current/route');

describe('GET /api/academic-years', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns list of academic years', async () => {
    const { db } = await import('@/lib/db');
    db.orderBy.mockResolvedValue([
      { id: 'y1', name: '2024/2025', isCurrent: true, schoolId },
    ]);

    const req = new NextRequest('http://localhost/api/academic-years');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/academic-years', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a year with valid data', async () => {
    const { db } = await import('@/lib/db');
    db.limit.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/academic-years', {
      method: 'POST',
      body: JSON.stringify({ name: '2025/2026', startDate: '2025-09-08', endDate: '2026-07-17' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 400 for invalid dates', async () => {
    const req = new NextRequest('http://localhost/api/academic-years', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bad', startDate: 'not-a-date', endDate: '2026-01-01' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/academic-years/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns year with terms', async () => {
    const { db } = await import('@/lib/db');
    db.limit.mockResolvedValueOnce([{ id: 'y1', name: '2024/2025', schoolId, startDate: new Date(), endDate: new Date() }]);
    db.orderBy.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost/api/academic-years/y1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await detailGET(req, { params: Promise.resolve({ id: 'y1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.id).toBe('y1');
  });
});
