import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const schoolId = "school-1";

vi.mock("next/headers", () => ({ cookies: () => ({ get: () => null }) }));
vi.mock("@/lib/auth/auth.config", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "u1", role: "admin", schoolId, email: "a@b.com", name: "A" },
  }),
}));
vi.mock("@/lib/tenant/resolve", () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId }),
}));

vi.mock("@/lib/db", () => {
  const mockStudents = [
    {
      id: "s1",
      firstName: "John",
      lastName: "Doe",
      otherNames: null,
      studentIdNumber: "STU001",
      gender: "male",
      status: "active",
      enrollmentDate: "2024-09-01",
      className: "Class 1A",
      gradeLevelName: "Grade 1",
      guardianName: "Jane Doe",
    },
    {
      id: "s2",
      firstName: "Jane",
      lastName: "Smith",
      otherNames: null,
      studentIdNumber: "STU002",
      gender: "female",
      status: "active",
      enrollmentDate: "2024-09-01",
      className: "Class 1B",
      gradeLevelName: "Grade 1",
      guardianName: "John Smith",
    },
  ];

  const whereFn = vi.fn().mockImplementation(function (this: any) {
    const callCount = whereFn.mock.calls.length;
    if (callCount % 2 === 1) return Promise.resolve([{ count: "5" }]);
    return this;
  });

  const mockDb: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: whereFn,
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(mockStudents),
  };
  return { db: mockDb };
});

const { GET } = await import("@/app/api/students/route");

describe("GET /api/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated student list", async () => {
    const req = new NextRequest(
      "http://localhost/api/students?page=1&pageSize=10",
    );
    req.headers.set("host", "demo.edunexus.com");
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 5,
      totalPages: 1,
    });
  });

  it("filters by search term", async () => {
    const req = new NextRequest("http://localhost/api/students?search=John");
    req.headers.set("host", "demo.edunexus.com");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("filters by classId", async () => {
    const req = new NextRequest("http://localhost/api/students?classId=c1");
    req.headers.set("host", "demo.edunexus.com");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("requires admin role", async () => {
    const { auth } = await import("@/lib/auth/auth.config");
    (auth as any).mockResolvedValueOnce({
      user: {
        id: "u2",
        role: "student",
        schoolId,
        email: "s@b.com",
        name: "S",
      },
    });
    const req = new NextRequest("http://localhost/api/students");
    req.headers.set("host", "demo.edunexus.com");
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
