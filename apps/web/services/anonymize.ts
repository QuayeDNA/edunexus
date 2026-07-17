import { eq } from "drizzle-orm";
import { applicants } from "@edunexus/database";

export async function anonymizeApplicant(
  db: any,
  applicantId: string,
): Promise<void> {
  await db
    .update(applicants)
    .set({
      anonymizedAt: new Date(),
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
    })
    .where(eq(applicants.id, applicantId));
}
