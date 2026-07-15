import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
const mockAnonymize = vi.fn().mockResolvedValue(undefined);

let mockQueryResult: any[] = [];

function createQueryBuilder() {
  const q = vi.fn(() => Promise.resolve(mockQueryResult));
  q.then = (resolve: (value: unknown) => void) => resolve(mockQueryResult);
  q.catch = () => {};
  q.select = vi.fn().mockReturnValue(q);
  q.from = vi.fn().mockReturnValue(q);
  q.where = vi.fn().mockReturnValue(q);
  q.orderBy = vi.fn().mockReturnValue(q);
  q.limit = vi.fn().mockResolvedValue([]);
  q.insert = vi.fn().mockReturnValue(q);
  q.values = vi.fn().mockReturnValue(q);
  q.returning = vi.fn().mockResolvedValue([{ id: 'new-app-1' }]);
  q.update = vi.fn().mockReturnValue(q);
  q.set = vi.fn().mockReturnValue(q);
  return q;
}

const mockDb = createQueryBuilder();

vi.mock('next/server', () => ({
  NextRequest: class NextRequest extends Request {
    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
    }
  },
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init),
  },
}));
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/services/email', () => ({ sendEmail: mockSendEmail }));
vi.mock('@/services/anonymize', () => ({ anonymizeApplicant: mockAnonymize }));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null, user: { id: 'admin-1', role: 'admin' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));

function makeRequest(body: any): Request {
  return new Request('http://localhost:3000/api/applicants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockDb.mockImplementation(() => Promise.resolve(mockQueryResult));
  mockDb.then = (resolve: (value: unknown) => void) => resolve(mockQueryResult);
  mockDb.catch = () => {};
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.orderBy.mockReturnValue(mockDb);
  mockDb.limit.mockResolvedValue([]);
  mockDb.insert.mockReturnValue(mockDb);
  mockDb.values.mockReturnValue(mockDb);
  mockDb.returning.mockResolvedValue([{ id: 'new-app-1' }]);
  mockDb.update.mockReturnValue(mockDb);
  mockDb.set.mockReturnValue(mockDb);
});

describe('POST /api/applicants — re-application cooldown', () => {
  it('returns 409 when cooldown has not expired', async () => {
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const gradeLevelId = '00000000-0000-0000-0000-000000000001';
    mockQueryResult = [{ id: gradeLevelId, schoolId: 'school-1' }];
    mockDb.limit.mockResolvedValueOnce([{ id: 'rejected-1', createdAt: recentDate }]);

    const { POST } = await import('@/app/api/applicants/route');
    const res = await POST(makeRequest({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2015-01-01',
      gender: 'male',
      guardianName: 'Jane Doe',
      guardianEmail: 'jane@example.com',
      gradeLevelId,
    }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('re-apply');
    expect(mockAnonymize).not.toHaveBeenCalled();
  });

  it('allows application when cooldown has expired and anonymizes old record', async () => {
    const gradeLevelId = '00000000-0000-0000-0000-000000000001';
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000); // 200 days ago, > 6 months
    mockQueryResult = [{ id: gradeLevelId, schoolId: 'school-1' }];
    mockDb.limit.mockResolvedValueOnce([{ id: 'rejected-1', createdAt: oldDate }]);
    mockDb.returning.mockResolvedValueOnce([{ id: 'new-app-1', status: 'submitted' }]);

    const { POST } = await import('@/app/api/applicants/route');
    const res = await POST(makeRequest({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2015-01-01',
      gender: 'male',
      guardianName: 'Jane Doe',
      guardianEmail: 'jane@example.com',
      gradeLevelId,
    }));

    expect(res.status).toBe(200);
    expect(mockAnonymize).toHaveBeenCalledWith(expect.anything(), 'rejected-1');
  });

  it('allows application when no existing rejected record exists', async () => {
    const gradeLevelId = '00000000-0000-0000-0000-000000000001';
    mockQueryResult = [{ id: gradeLevelId, schoolId: 'school-1' }];
    mockDb.limit.mockResolvedValueOnce([]); // no existing rejected
    mockDb.returning.mockResolvedValueOnce([{ id: 'new-app-1', status: 'submitted' }]);

    const { POST } = await import('@/app/api/applicants/route');
    const res = await POST(makeRequest({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '2015-01-01',
      gender: 'male',
      guardianName: 'Jane Doe',
      guardianEmail: 'jane@example.com',
      gradeLevelId,
    }));

    expect(res.status).toBe(200);
    expect(mockAnonymize).not.toHaveBeenCalled();
  });
});
