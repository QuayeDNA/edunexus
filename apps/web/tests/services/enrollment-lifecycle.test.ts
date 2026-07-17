import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};
const mockDb = { transaction: vi.fn() };

vi.mock("@/lib/db", () => ({ db: mockDb }));

const { updateEnrollmentStatus } =
  await import("@/services/enrollment-lifecycle");

describe("updateEnrollmentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions active to withdrawn", async () => {
    tx.limit
      .mockResolvedValueOnce([
        { id: "e1", status: "active", studentId: "s1", schoolId: "sch1" },
      ])
      .mockResolvedValueOnce([]);
    tx.returning.mockResolvedValue([
      {
        id: "e1",
        status: "withdrawn",
        endDate: "2026-07-15",
        transferReason: "Family relocation",
        transferSchoolName: null,
      },
    ]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await updateEnrollmentStatus({
      enrollmentId: "e1",
      schoolId: "sch1",
      newStatus: "withdrawn",
      reason: "Family relocation",
    });

    expect(result.status).toBe("withdrawn");
    expect(result.endDate).toBe("2026-07-15");
  });

  it("rejects invalid transition (graduated -> withdrawn)", async () => {
    tx.limit.mockResolvedValueOnce([
      { id: "e1", status: "graduated", studentId: "s1", schoolId: "sch1" },
    ]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(
      updateEnrollmentStatus({
        enrollmentId: "e1",
        schoolId: "sch1",
        newStatus: "withdrawn",
      }),
    ).rejects.toThrow(
      "Cannot transition enrollment from graduated to withdrawn",
    );
  });

  it("throws 404 if enrollment not found", async () => {
    tx.limit.mockResolvedValueOnce([]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(
      updateEnrollmentStatus({
        enrollmentId: "nonexistent",
        schoolId: "sch1",
        newStatus: "withdrawn",
      }),
    ).rejects.toThrow("Enrollment not found");
  });

  it("throws 404 if schoolId does not match", async () => {
    tx.limit.mockResolvedValueOnce([
      { id: "e1", status: "active", studentId: "s1", schoolId: "sch1" },
    ]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(
      updateEnrollmentStatus({
        enrollmentId: "e1",
        schoolId: "other-school",
        newStatus: "withdrawn",
      }),
    ).rejects.toThrow("Enrollment not found");
  });

  it("updates student status when no other active enrollments remain", async () => {
    tx.limit
      .mockResolvedValueOnce([
        { id: "e1", status: "active", studentId: "s1", schoolId: "sch1" },
      ])
      .mockResolvedValueOnce([]);
    tx.returning.mockResolvedValue([
      {
        id: "e1",
        status: "withdrawn",
        endDate: "2026-07-15",
        transferReason: "Family relocation",
        transferSchoolName: null,
      },
    ]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    await updateEnrollmentStatus({
      enrollmentId: "e1",
      schoolId: "sch1",
      newStatus: "withdrawn",
      reason: "Family relocation",
    });

    expect(tx.update).toHaveBeenCalledTimes(2);
  });

  it("does not update student status when other active enrollments exist", async () => {
    tx.limit
      .mockResolvedValueOnce([
        { id: "e1", status: "active", studentId: "s1", schoolId: "sch1" },
      ])
      .mockResolvedValueOnce([{ id: "e2", status: "active" }]);
    tx.returning.mockResolvedValue([
      {
        id: "e1",
        status: "transferred_out",
        endDate: "2026-07-15",
        transferReason: "Moving",
        transferSchoolName: "New School",
      },
    ]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    await updateEnrollmentStatus({
      enrollmentId: "e1",
      schoolId: "sch1",
      newStatus: "transferred_out",
      reason: "Moving",
      targetSchoolName: "New School",
    });

    expect(tx.update).toHaveBeenCalledTimes(1);
  });
});
