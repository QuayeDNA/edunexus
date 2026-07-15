import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendEmail = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/services/email', () => ({ sendEmail: mockSendEmail }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'admin-1', role: 'admin', schoolId: 'school-1', email: 'admin@school.com', name: 'Admin User' },
  }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));
vi.mock('@/services/email/templates/application-under-review', () => ({
  applicationUnderReviewEmail: vi.fn(() => '<p>Under review</p>'),
}));
vi.mock('@/services/email/templates/application-accepted', () => ({
  applicationAcceptedEmail: vi.fn(() => '<p>Accepted</p>'),
}));
vi.mock('@/services/email/templates/application-rejected', () => ({
  applicationRejectedEmail: vi.fn(() => '<p>Rejected</p>'),
}));
vi.mock('@/services/email/templates/application-waitlisted', () => ({
  applicationWaitlistedEmail: vi.fn(() => '<p>Waitlisted</p>'),
}));

function makeRequest(method: string, path: string, body?: any) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: body ? JSON.stringify(body) : undefined,
  }) as any;
}

function makeApplicantRow(overrides = {}) {
  return {
    id: 'app-1',
    schoolId: 'school-1',
    firstName: 'John',
    lastName: 'Doe',
    guardianName: 'Jane Doe',
    guardianEmail: 'jane@example.com',
    status: 'submitted',
    createdAt: new Date('2026-01-01'),
    gradeLevelId: 'grade-1',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/applicants/[id] — email notifications', () => {
  it('sends under_review email when status changes to under_review', async () => {
    mockDb.limit.mockResolvedValueOnce([makeApplicantRow()]);
    mockDb.returning.mockResolvedValueOnce([{ ...makeApplicantRow(), status: 'under_review' }]);

    const { PATCH } = await import('@/app/api/applicants/[id]/route');
    await PATCH(makeRequest('PATCH', '/api/applicants/app-1', { status: 'under_review' }), { params: Promise.resolve({ id: 'app-1' }) } as any);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@example.com',
      subject: expect.stringContaining('Under Review'),
    }));
  });

  it('sends accepted email when status changes to accepted', async () => {
    mockDb.limit.mockResolvedValueOnce([makeApplicantRow({ status: 'under_review' })]);
    mockDb.returning.mockResolvedValueOnce([{ ...makeApplicantRow({ status: 'under_review' }), status: 'accepted' }]);

    const { PATCH } = await import('@/app/api/applicants/[id]/route');
    await PATCH(makeRequest('PATCH', '/api/applicants/app-1', { status: 'accepted' }), { params: Promise.resolve({ id: 'app-1' }) } as any);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@example.com',
      subject: expect.stringContaining('Accepted'),
    }));
  });

  it('sends rejected email when status changes to rejected', async () => {
    mockDb.limit.mockResolvedValueOnce([makeApplicantRow({ status: 'under_review' })]);
    mockDb.returning.mockResolvedValueOnce([{ ...makeApplicantRow({ status: 'under_review' }), status: 'rejected' }]);

    const { PATCH } = await import('@/app/api/applicants/[id]/route');
    await PATCH(makeRequest('PATCH', '/api/applicants/app-1', { status: 'rejected' }), { params: Promise.resolve({ id: 'app-1' }) } as any);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@example.com',
      subject: expect.stringContaining('Status Update'),
    }));
  });

  it('sends waitlisted email when status changes to waitlisted', async () => {
    mockDb.limit.mockResolvedValueOnce([makeApplicantRow({ status: 'under_review' })]);
    mockDb.returning.mockResolvedValueOnce([{ ...makeApplicantRow({ status: 'under_review' }), status: 'waitlisted' }]);

    const { PATCH } = await import('@/app/api/applicants/[id]/route');
    await PATCH(makeRequest('PATCH', '/api/applicants/app-1', { status: 'waitlisted' }), { params: Promise.resolve({ id: 'app-1' }) } as any);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@example.com',
      subject: expect.stringContaining('Waitlisted'),
    }));
  });

  it('does not send email when status does not change', async () => {
    mockDb.limit.mockResolvedValueOnce([makeApplicantRow({ status: 'under_review' })]);
    mockDb.returning.mockResolvedValueOnce([makeApplicantRow({ status: 'under_review' })]);

    const { PATCH } = await import('@/app/api/applicants/[id]/route');
    await PATCH(makeRequest('PATCH', '/api/applicants/app-1', { guardianName: 'New Name' }), { params: Promise.resolve({ id: 'app-1' }) } as any);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
