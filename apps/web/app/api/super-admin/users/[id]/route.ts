import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { profiles, auditLogs } from "@edunexus/database";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess } from "@/lib/api/response";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/api/errors";
import { routeHandler } from "@/lib/api/handler";

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["admin", "teacher", "student", "parent"]).optional(),
});

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const { error: authError, user } = await requireRole("super_admin");
    if (authError) return authError;

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, params.id))
      .limit(1);
    if (!existing) throw new NotFoundError("User");

    if (existing.role === "super_admin") {
      throw new ForbiddenError("Cannot modify super admin users");
    }

    const [updated] = await db
      .update(profiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profiles.id, params.id))
      .returning();

    await db.insert(auditLogs).values({
      schoolId: existing.schoolId!,
      userId: user!.id,
      action: "user.updated",
      tableName: "profiles",
      recordId: params.id,
      oldData: { isActive: existing.isActive, role: existing.role },
      newData: parsed.data,
    });

    return apiSuccess(updated);
  },
);

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: { params: { id: string } }) => {
    const { error: authError, user } = await requireRole("super_admin");
    if (authError) return authError;

    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, params.id))
      .limit(1);
    if (!existing) throw new NotFoundError("User");
    if (existing.role === "super_admin")
      throw new ForbiddenError("Cannot delete super admin users");

    await db
      .update(profiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(profiles.id, params.id));

    await db.insert(auditLogs).values({
      schoolId: existing.schoolId!,
      userId: user!.id,
      action: "user.deleted",
      tableName: "profiles",
      recordId: params.id,
      oldData: { email: existing.email },
    });

    return apiSuccess({ deleted: true });
  },
);
