import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({ cookies: () => ({ get: () => null }) }));
vi.mock("@/lib/auth/auth.config", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "u1",
      role: "admin",
      schoolId: "school-1",
      email: "a@b.com",
      name: "A",
    },
  }),
}));
vi.mock("@/lib/tenant/resolve", () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: "school-1" }),
}));

vi.mock("@/lib/db", () => {
  const mockStudent = {
    id: "s1",
    firstName: "John",
    lastName: "Doe",
    otherNames: null,
    studentIdNumber: "STU001",
    gender: "male",
    status: "active",
    dateOfBirth: new Date("2015-06-15"),
    enrollmentDate: new Date("2024-09-01"),
    placeOfBirth: null,
    nationality: null,
    religion: null,
    address: null,
    phone: null,
    email: null,
    bloodGroup: null,
    medicalNotes: null,
    schoolId: "school-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([mockStudent]),
  };
  return { db: mockDb };
});

const { GET } = await import("@/app/api/students/[id]/route");

describe("GET /api/students/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns student detail", async () => {
    const req = new NextRequest("http://localhost/api/students/s1");
    req.headers.set("host", "demo.edunexus.com");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("s1");
    expect(body.data.firstName).toBe("John");
  });

  it("returns 404 for missing student", async () => {
    const { db } = await import("@/lib/db");
    (db as any).limit.mockResolvedValueOnce([]);
    const req = new NextRequest("http://localhost/api/students/missing");
    req.headers.set("host", "demo.edunexus.com");
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("requires admin role", async () => {
    const { auth } = await import("@/lib/auth/auth.config");
    (auth as any).mockResolvedValueOnce({
      user: {
        id: "u2",
        role: "student",
        schoolId: "school-1",
        email: "s@b.com",
        name: "S",
      },
    });
    const req = new NextRequest("http://localhost/api/students/s1");
    req.headers.set("host", "demo.edunexus.com");
    const res = await GET(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(403);
  });
});
