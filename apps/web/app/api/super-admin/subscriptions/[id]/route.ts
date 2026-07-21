import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { schoolSubscriptions } from "@edunexus/database";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { routeHandler } from "@/lib/api/handler";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess } from "@/lib/api/response";

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(["active", "past_due", "cancelled", "expired"]).optional(),
});

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const { error: authError } = await requireRole("super_admin");
    if (authError) return authError;

    const body = await request.json();
    const parsed = updateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const [existing] = await db
      .select()
      .from(schoolSubscriptions)
      .where(eq(schoolSubscriptions.id, id))
      .limit(1);
    if (!existing) throw new NotFoundError("Subscription");

    const [updated] = await db
      .update(schoolSubscriptions)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schoolSubscriptions.id, id))
      .returning();

    return apiSuccess(updated);
  },
);
