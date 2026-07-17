import { db } from "@/lib/db";
import { enrollments, students } from "@edunexus/database";
import { eq, and } from "drizzle-orm";
import { NotFoundError, AppError } from "@/lib/api/errors";

export type EnrollmentStatus =
  "active" | "withdrawn" | "transferred_out" | "graduated";

interface UpdateEnrollmentStatusParams {
  enrollmentId: string;
  schoolId: string;
  newStatus: EnrollmentStatus;
  reason?: string;
  targetSchoolName?: string;
}

export interface EnrollmentLifecycleResult {
  id: string;
  status: string;
  endDate: string | null;
  transferReason: string | null;
  transferSchoolName: string | null;
}

const VALID_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  active: ["withdrawn", "transferred_out", "graduated"],
  withdrawn: [],
  transferred_out: [],
  graduated: [],
};

export async function updateEnrollmentStatus(
  params: UpdateEnrollmentStatusParams,
): Promise<EnrollmentLifecycleResult> {
  return db.transaction(async (tx) => {
    const [enrollment] = await tx
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, params.enrollmentId))
      .limit(1);

    if (!enrollment) throw new NotFoundError("Enrollment");
    if (enrollment.schoolId !== params.schoolId)
      throw new NotFoundError("Enrollment");

    const allowedTransitions =
      VALID_TRANSITIONS[enrollment.status as EnrollmentStatus] ?? [];
    if (!allowedTransitions.includes(params.newStatus as EnrollmentStatus)) {
      throw new AppError(
        `Cannot transition enrollment from ${enrollment.status} to ${params.newStatus}`,
        422,
      );
    }

    const now = new Date().toISOString().split("T")[0];

    const [updated] = await tx
      .update(enrollments)
      .set({
        status: params.newStatus,
        endDate: now,
        transferReason: params.reason ?? null,
        transferSchoolName: params.targetSchoolName ?? null,
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, params.enrollmentId))
      .returning();

    const otherActive = await tx
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, enrollment.studentId),
          eq(enrollments.status, "active"),
        ),
      )
      .limit(1);

    if (otherActive.length === 0) {
      await tx
        .update(students)
        .set({ status: params.newStatus, updatedAt: new Date() })
        .where(eq(students.id, enrollment.studentId));
    }

    return {
      id: updated.id,
      status: updated.status!,
      endDate: updated.endDate,
      transferReason: updated.transferReason,
      transferSchoolName: updated.transferSchoolName,
    };
  });
}
