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
    returning: vi.fn(),
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockDb)),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/terms/route');
const { PATCH, DELETE } = await import('@/app/api/terms/[id]/route');
const { POST: setCurrentPOST } = await import('@/app/api/terms/[id]/set-current/route');
const { POST: toggleLockPOST } = await import('@/app/api/terms/[id]/toggle-lock/route');

beforeEach(() => { vi.clearAllMocks(); });

describe('GET /api/terms', () => {
  it('returns 400 if academicYearId missing', async () => {
    const req = new NextRequest('http://localhost/api/terms');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    expect(res.status).toBe(400);
  });

  it('returns terms for a valid academicYearId', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([
      { id: 't1', termNumber: '1', name: 'First Term', locked: false, schoolId },
    ]);

    const req = new NextRequest('http://localhost/api/terms?academicYearId=y1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/terms', () => {
  it('creates a term with valid data', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: '11111111-1111-1111-1111-111111111111', startDate: new Date('2024-09-09'), endDate: new Date('2025-07-18'), schoolId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    db.returning.mockResolvedValue([{ id: 't1', name: 'First Term', locked: false, schoolId }]);

    const req = new NextRequest('http://localhost/api/terms', {
      method: 'POST',
      body: JSON.stringify({ academicYearId: '11111111-1111-1111-1111-111111111111', termNumber: '1', name: 'First Term', startDate: '2024-09-09', endDate: '2024-12-13' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.name).toBe('First Term');
  });
});

describe('PATCH /api/terms/[id]', () => {
  it('updates a term', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 't1', schoolId, academicYearId: 'y1' }]);
    db.returning.mockResolvedValue([{ id: 't1', name: 'Updated', schoolId }]);

    const req = new NextRequest('http://localhost/api/terms/t1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated');
  });
});

describe('DELETE /api/terms/[id]', () => {
  it('deletes a term', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 't1', schoolId }]);
    db.returning.mockResolvedValue([{ id: 't1' }]);

    const req = new NextRequest('http://localhost/api/terms/t1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });
});

describe('POST /api/terms/[id]/toggle-lock', () => {
  it('toggles term locked status', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([{ id: 't1', locked: false, schoolId }]);
    db.returning.mockResolvedValue([{ id: 't1', locked: true, schoolId }]);

    const req = new NextRequest('http://localhost/api/terms/t1/toggle-lock', { method: 'POST' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await toggleLockPOST(req, { params: Promise.resolve({ id: 't1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.locked).toBe(true);
  });
});

describe('POST /api/terms/[id]/set-current', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets the term as current', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: 't1', schoolId, academicYearId: 'y1' }])
      .mockResolvedValueOnce([{ isCurrent: true }]);

    const req = new NextRequest('http://localhost/api/terms/t1/set-current', { method: 'POST' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await setCurrentPOST(req, { params: Promise.resolve({ id: 't1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
  });
});
