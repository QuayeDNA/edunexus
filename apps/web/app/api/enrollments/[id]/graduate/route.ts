import { NextRequest } from "next/server";
import { routeHandler } from "@/lib/api/handler";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { updateEnrollmentStatus } from "@/services/enrollment-lifecycle";
import { resolveTenant } from "@/lib/tenant/resolve";

export const POST = routeHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const { error: authError } = await requireRole("admin", "super_admin");
    if (authError) return authError;

    const host = request.headers.get("host") ?? "";
    const tenant = await resolveTenant(host);
    const schoolId = tenant.schoolId;
    if (!schoolId) return apiError(400, "Tenant not resolved");

    const { id } = params;

    const result = await updateEnrollmentStatus({
      enrollmentId: id,
      schoolId,
      newStatus: "graduated",
    });
    return apiSuccess(result);
  },
);
