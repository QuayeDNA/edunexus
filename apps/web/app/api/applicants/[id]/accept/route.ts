import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  applicants,
  classes,
  auditLogs,
  students,
  guardians,
  studentGuardians,
  enrollments,
  profiles,
  academicYears,
  schools,
} from "@edunexus/database";
import { eq, and, count } from "drizzle-orm";
import { z } from "zod";
import { scryptSync, randomBytes } from "crypto";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { resolveTenant } from "@/lib/tenant/resolve";
import { generateStudentId } from "@/services/student-id";

const acceptSchema = z.object({
  targetClassId: z.string().uuid(),
  adminNotes: z.string().optional(),
  sendEmail: z.boolean().default(false),
  override: z.boolean().default(false),
});

function hashPassword(password: string): string {
  const salt = randomBytes(32).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError, user } = await requireRole("admin", "super_admin");
  if (authError) return authError;

  const host = request.headers.get("host") ?? "";
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, "Tenant not resolved");

  const [existing] = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.schoolId, schoolId)))
    .limit(1);
  if (!existing) return apiError(404, "Applicant not found");

  if (existing.status !== "under_review" && existing.status !== "waitlisted") {
    return apiError(
      422,
      `Cannot accept from '${existing.status}' — must be 'under_review' or 'waitlisted'`,
    );
  }

  const body = await request.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      422,
      "Validation failed",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const [targetClass] = await db
    .select()
    .from(classes)
    .where(
      and(
        eq(classes.id, parsed.data.targetClassId),
        eq(classes.schoolId, schoolId),
      ),
    )
    .limit(1);
  if (!targetClass) return apiError(404, "Target class not found");

  if (targetClass.gradeLevelId !== existing.gradeLevelId) {
    return apiError(422, "Target class does not match applicant's grade level");
  }

  const [acceptedResult] = await db
    .select({ count: count() })
    .from(applicants)
    .where(
      and(
        eq(applicants.targetClassId, parsed.data.targetClassId),
        eq(applicants.status, "accepted"),
      ),
    )
    .limit(1);
  const acceptedCount = Number(acceptedResult?.count ?? 0);
  const capacity = targetClass.capacity ?? 999;
  const available = capacity - acceptedCount;

  if (available <= 0 && !parsed.data.override) {
    return apiError(
      409,
      `Class '${targetClass.name}' is at capacity (${acceptedCount}/${capacity}). Please select a different class or enable override to confirm.`,
    );
  }

  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  const [currentYear] = await db
    .select()
    .from(academicYears)
    .where(
      and(
        eq(academicYears.schoolId, schoolId),
        eq(academicYears.isCurrent, true),
      ),
    )
    .limit(1);
  if (!currentYear)
    return apiError(422, "No current academic year set for this school");

  const studentPassword = generateTempPassword();
  const studentPasswordHash = hashPassword(studentPassword);

  const parentPassword = generateTempPassword();
  const parentPasswordHash = hashPassword(parentPassword);

  let conversionResult: {
    student: typeof students.$inferSelect;
    enrollment: typeof enrollments.$inferSelect;
    guardian: typeof guardians.$inferSelect;
    studentProfile: typeof profiles.$inferSelect | null;
    parentProfile: typeof profiles.$inferSelect | null;
  };

  try {
    const txResult = await db.transaction(async (tx) => {
      const studentIdNumber = await generateStudentId(
        tx,
        schoolId,
        school?.code ?? "SCH",
      );

      const [student] = await tx
        .insert(students)
        .values({
          schoolId,
          studentIdNumber,
          firstName: existing.firstName,
          lastName: existing.lastName,
          gender: existing.gender,
          dateOfBirth: existing.dateOfBirth,
          enrollmentDate: new Date().toISOString().split("T")[0],
          status: "active",
        })
        .returning();

      const [enrollment] = await tx
        .insert(enrollments)
        .values({
          schoolId,
          studentId: student.id,
          classId: targetClass.id,
          academicYearId: currentYear.id,
          status: "active",
          enrollmentDate: new Date().toISOString().split("T")[0],
        })
        .returning();

      const guardianNameParts = (existing.guardianName ?? "")
        .trim()
        .split(/\s+/);
      const guardianFirstName = guardianNameParts[0] || "Guardian";
      const guardianLastName =
        guardianNameParts.length > 1
          ? guardianNameParts.slice(1).join(" ")
          : "";

      const [guardian] = await tx
        .insert(guardians)
        .values({
          schoolId,
          firstName: guardianFirstName,
          lastName: guardianLastName,
          relationship: "Parent",
          phone: existing.guardianPhone ?? "",
          email: existing.guardianEmail,
          address: existing.guardianAddress,
          occupation: existing.guardianOccupation,
          isPrimary: true,
        })
        .returning();

      await tx.insert(studentGuardians).values({
        studentId: student.id,
        guardianId: guardian.id,
        relationship: "Parent",
        isEmergency: false,
      });

      const [existingStudentProfile] = await tx
        .select()
        .from(profiles)
        .where(
          and(
            eq(profiles.schoolId, schoolId),
            eq(
              profiles.email,
              `${student.studentIdNumber.toLowerCase()}@edunexus.com`,
            ),
          ),
        )
        .limit(1);

      let studentProfile: typeof profiles.$inferSelect | null = null;
      if (!existingStudentProfile) {
        const pwdHash = studentPasswordHash;
        [studentProfile] = await tx
          .insert(profiles)
          .values({
            schoolId,
            email: `${student.studentIdNumber.toLowerCase()}@edunexus.com`,
            passwordHash: pwdHash,
            role: "student",
            firstName: existing.firstName,
            lastName: existing.lastName,
            phone: null,
            isActive: true,
          })
          .returning();
      }

      const [existingParentProfile] = await tx
        .select()
        .from(profiles)
        .where(
          and(
            eq(profiles.schoolId, schoolId),
            eq(profiles.email, existing.guardianEmail),
          ),
        )
        .limit(1);

      let parentProfile: typeof profiles.$inferSelect | null = null;
      if (!existingParentProfile) {
        [parentProfile] = await tx
          .insert(profiles)
          .values({
            schoolId,
            email: existing.guardianEmail,
            passwordHash: parentPasswordHash,
            role: "parent",
            firstName: guardianFirstName,
            lastName: guardianLastName,
            phone: existing.guardianPhone,
            isActive: true,
          })
          .returning();
      }

      const [updatedApplicant] = await tx
        .update(applicants)
        .set({
          status: "accepted",
          targetClassId: parsed.data.targetClassId,
          adminNotes:
            parsed.data.adminNotes !== undefined
              ? parsed.data.adminNotes
              : existing.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(applicants.id, id))
        .returning();

      if (!updatedApplicant) throw new Error("Failed to update applicant");

      return {
        student,
        enrollment,
        guardian,
        studentProfile,
        parentProfile,
      };
    });

    conversionResult = txResult;
  } catch {
    return apiError(500, "Conversion failed — no records were created");
  }

  await db.insert(auditLogs).values({
    schoolId,
    userId: user!.id,
    action: "applicant.converted",
    tableName: "applicants",
    recordId: id,
    oldData: { status: existing.status },
    newData: {
      status: "accepted",
      studentId: conversionResult.student.id,
      enrollmentId: conversionResult.enrollment.id,
      guardianId: conversionResult.guardian.id,
    },
  });

  return apiSuccess({
    applicant: {
      id,
      status: "accepted",
      targetClassId: parsed.data.targetClassId,
    },
    student: {
      id: conversionResult.student.id,
      studentIdNumber: conversionResult.student.studentIdNumber,
      firstName: conversionResult.student.firstName,
      lastName: conversionResult.student.lastName,
    },
    enrollment: {
      id: conversionResult.enrollment.id,
      classId: conversionResult.enrollment.classId,
      academicYearId: conversionResult.enrollment.academicYearId,
    },
    guardian: {
      id: conversionResult.guardian.id,
      name: `${conversionResult.guardian.firstName} ${conversionResult.guardian.lastName}`,
      email: conversionResult.guardian.email,
    },
    credentials: {
      student: {
        email: conversionResult.studentProfile?.email ?? null,
        password: studentPassword,
      },
      parent: {
        email: conversionResult.parentProfile?.email ?? null,
        password: parentPassword,
      },
    },
  });
}
