import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

const mockDb = {
  transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/services/student-id", () => ({
  generateStudentId: vi.fn().mockResolvedValue("AABS20260001"),
}));
vi.mock("crypto", () => ({
  randomBytes: vi.fn(() =>
    Buffer.from("00000000000000000000000000000000", "hex"),
  ),
  scryptSync: vi.fn(() => Buffer.from("a".repeat(64))),
}));

const { createStudentFromData } = await import("@/services/student-creation");

describe("createStudentFromData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates student, enrollment, guardian, studentGuardian, and profile in a transaction", async () => {
    const returning = mockTx.returning;
    returning
      .mockResolvedValueOnce([
        {
          id: "student-1",
          studentIdNumber: "AABS20260001",
          firstName: "John",
          lastName: "Doe",
        },
      ])
      .mockResolvedValueOnce([
        { id: "enrollment-1", classId: "class-1", academicYearId: "year-1" },
      ])
      .mockResolvedValueOnce([
        {
          id: "guardian-1",
          firstName: "Jane",
          lastName: "Doe",
          phone: "0205516734",
        },
      ])
      .mockResolvedValueOnce([{ id: "profile-1", email: "john@school.com" }]);

    const result = await createStudentFromData({
      schoolId: "school-1",
      schoolCode: "AABS",
      academicYearId: "year-1",
      firstName: "John",
      lastName: "Doe",
      gender: "male",
      dateOfBirth: "2015-06-01",
      classId: "class-1",
      guardianName: "Jane Doe",
      guardianPhone: "0205516734",
    });

    expect(result.student.studentIdNumber).toBe("AABS20260001");
    expect(result.enrollment.id).toBe("enrollment-1");
    expect(result.guardian.id).toBe("guardian-1");
    expect(result.credentials.student.email).toBe("john@school.com");
  });
});
