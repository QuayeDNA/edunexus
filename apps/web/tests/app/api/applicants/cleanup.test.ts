import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

const mockAnonymize = vi.fn();

vi.mock('@/lib/db/client', () => ({ db: mockDb }));
vi.mock('@/services/anonymize', () => ({ anonymizeApplicant: mockAnonymize }));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null, user: { id: 'admin-1', role: 'admin' } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/applicants/cleanup', () => {
  it('anonymizes expired rejected records and returns count', async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: 'id-1' }, { id: 'id-2' },
    ]);

    const { POST } = await import('@/app/api/applicants/cleanup/route');
    const req = new Request('http://localhost:3000/api/applicants/cleanup', { method: 'POST' });
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.anonymized).toBe(2);
    expect(mockAnonymize).toHaveBeenCalledTimes(2);
    expect(mockAnonymize).toHaveBeenCalledWith(mockDb, 'id-1');
  });

  it('returns 0 when no expired records exist', async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const { POST } = await import('@/app/api/applicants/cleanup/route');
    const req = new Request('http://localhost:3000/api/applicants/cleanup', { method: 'POST' });
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.anonymized).toBe(0);
    expect(mockAnonymize).not.toHaveBeenCalled();
  });
});
