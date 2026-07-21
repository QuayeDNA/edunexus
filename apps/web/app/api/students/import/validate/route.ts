import { NextRequest } from "next/server";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseCsv } from "@/services/csv-parser";
import { z } from "zod";

const rowSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  gender: z.enum(["male", "female"], { message: "Must be male or female" }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  classCode: z.string().min(1, "Required"),
  guardianName: z.string().min(1, "Required"),
  guardianPhone: z.string().min(1, "Required").max(20),
});

function applyMapping(
  headers: string[],
  cells: string[],
  mapping: Record<string, string>,
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const field = mapping[headers[i]];
    if (field) {
      fields[field] = cells[i] ?? "";
    }
  }
  return fields;
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole("admin", "super_admin");
  if (authError) return authError;

  const body = await request.json();
  if (!body.csv || typeof body.csv !== "string") {
    return apiError(422, "CSV content is required");
  }
  if (!body.mapping || typeof body.mapping !== "object") {
    return apiError(422, "Column mapping is required");
  }

  const result = parseCsv(body.csv);
  if (result.headers.length === 0) {
    return apiError(422, "CSV must have at least a header row");
  }

  const mapping: Record<string, string> = body.mapping;
  const rows = result.rows.map((row) => {
    const mapped = applyMapping(result.headers, row.cells, mapping);
    const parsed = rowSchema.safeParse(mapped);

    return {
      rowNumber: row.index,
      firstName: mapped.firstName ?? "",
      valid: parsed.success,
      errors: parsed.success
        ? null
        : (parsed.error.flatten().fieldErrors as Record<string, string[]>),
    };
  });

  const valid = rows.filter((r) => r.valid).length;

  return apiSuccess({
    total: rows.length,
    valid,
    invalid: rows.length - valid,
    rows,
  });
}
