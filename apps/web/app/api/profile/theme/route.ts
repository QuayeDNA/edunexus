import { eq } from "drizzle-orm";
import { profiles } from "@edunexus/database";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth.config";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

const themeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError(401, "Unauthorized");

  const row = await db
    .select({ themePreference: profiles.themePreference })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .then((rows) => rows[0] ?? null);

  return apiSuccess({ theme: row?.themePreference ?? "system" });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError(401, "Unauthorized");

  const body = await request.json();
  const parsed = themeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "Invalid theme value");
  }

  await db
    .update(profiles)
    .set({ themePreference: parsed.data.theme })
    .where(eq(profiles.id, session.user.id));

  return apiSuccess({ theme: parsed.data.theme });
}
