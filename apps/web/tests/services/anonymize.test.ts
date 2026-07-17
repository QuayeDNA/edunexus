import { describe, it, expect, vi, beforeEach } from "vitest";
import { anonymizeApplicant } from "@/services/anonymize";

const mockDb = {
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/db/client", () => ({
  db: mockDb,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("anonymizeApplicant", () => {
  it("clears personal fields and sets anonymized_at", async () => {
    await anonymizeApplicant(mockDb as any, "test-id");

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymizedAt: expect.any(Date),
        firstName: "[redacted]",
        lastName: "[redacted]",
        dateOfBirth: null,
        guardianName: null,
        guardianEmail: null,
        guardianPhone: null,
        guardianAddress: null,
        guardianOccupation: null,
        guardianEmployer: null,
        previousSchool: null,
        medicalAllergies: null,
        medicalConditions: null,
        medicalMedications: null,
        doctorName: null,
        doctorPhone: null,
        emergencyContacts: null,
        siblingDetails: null,
        birthCertificateFileId: null,
        priorReportCardFileId: null,
        photoFileId: null,
      }),
    );
    expect(mockDb.where).toHaveBeenCalled();
  });
});
