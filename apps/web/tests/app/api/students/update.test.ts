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
  const mockDb: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: "s1" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: "s1",
        firstName: "Updated",
        lastName: "Name",
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
      },
    ]),
  };
  return { db: mockDb };
});

const { PATCH } = await import("@/app/api/students/[id]/route");

describe("PATCH /api/students/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates student profile", async () => {
    const req = new NextRequest("http://localhost/api/students/s1", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Updated", lastName: "Name" }),
    });
    req.headers.set("host", "demo.edunexus.com");
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.firstName).toBe("Updated");
  });

  it("validates request body", async () => {
    const req = new NextRequest("http://localhost/api/students/s1", {
      method: "PATCH",
      body: JSON.stringify({ gender: "invalid" }),
    });
    req.headers.set("host", "demo.edunexus.com");
    const res = await PATCH(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 404 for missing student", async () => {
    const { db } = await import("@/lib/db");
    (db as any).limit.mockResolvedValueOnce([]);
    const req = new NextRequest("http://localhost/api/students/missing", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Test" }),
    });
    req.headers.set("host", "demo.edunexus.com");
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});
