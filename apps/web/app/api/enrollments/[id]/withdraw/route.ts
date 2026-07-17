import { NextRequest } from "next/server";
import { z } from "zod";
import { routeHandler } from "@/lib/api/handler";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { updateEnrollmentStatus } from "@/services/enrollment-lifecycle";
import { resolveTenant } from "@/lib/tenant/resolve";

const schema = z.object({ reason: z.string().min(1, "Reason is required") });

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

    const result = await updateEnrollmentStatus({
      enrollmentId: id,
      schoolId,
      newStatus: "withdrawn",
      reason: parsed.data.reason,
    });
    return apiSuccess(result);
  },
);
