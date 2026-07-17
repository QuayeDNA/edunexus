import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  students,
  enrollments,
  classes,
  academicYears,
} from "@edunexus/database";
import { eq, and } from "drizzle-orm";
import { routeHandler } from "@/lib/api/handler";
import { NotFoundError, AppError } from "@/lib/api/errors";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { resolveTenant } from "@/lib/tenant/resolve";

const schema = z.object({
  classId: z.string().uuid("Valid class ID is required"),
  academicYearId: z.string().uuid("Valid academic year ID is required"),
});

export const POST = routeHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const { error: authError } = await requireRole("admin", "super_admin");
    if (authError) return authError;

    const host = request.headers.get("host") ?? "";
    const tenant = await resolveTenant(host);
    const schoolId = tenant.schoolId;
    if (!schoolId) return apiError(400, "Tenant not resolved");

    const { id } = params;

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw parsed.error;

    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
      .limit(1);

    if (!student) throw new NotFoundError("Student");
    if (student.status === "active")
      throw new AppError("Student is already active", 422);
    if (!["withdrawn", "transferred_out"].includes(student.status!))
      throw new AppError(
        `Cannot re-admit student with status '${student.status}'`,
        422,
      );

    const [targetClass] = await db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.id, parsed.data.classId),
          eq(classes.schoolId, schoolId),
        ),
      )
      .limit(1);
    if (!targetClass) throw new NotFoundError("Class");

    const [academicYear] = await db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.id, parsed.data.academicYearId),
          eq(academicYears.schoolId, schoolId),
        ),
      )
      .limit(1);
    if (!academicYear) throw new NotFoundError("Academic year");

    const result = await db.transaction(async (tx) => {
      const [enrollment] = await tx
        .insert(enrollments)
        .values({
          schoolId,
          studentId: student.id,
          classId: targetClass.id,
          academicYearId: academicYear.id,
          status: "active",
          enrollmentDate: new Date().toISOString().split("T")[0],
        })
        .returning();

      await tx
        .update(students)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(students.id, student.id));

      return {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          classId: enrollment.classId,
          academicYearId: enrollment.academicYearId,
        },
        student: { id: student.id, status: "active" },
      };
    });

    return apiSuccess(result);
  },
);
