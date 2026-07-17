import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { createStorageProvider } from "@/services/storage";
import {
  FileTypeNotAllowedError,
  FileTooLargeError,
} from "@/services/storage/errors";
import { db } from "@/lib/db/client";
import { mediaFiles } from "@edunexus/database";
import { resolveTenant } from "@/lib/tenant/resolve";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  buildStoragePath,
} from "@edunexus/shared";

import { randomUUID } from "crypto";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(ip)) {
      return apiError(429, "Too many uploads. Try again later.");
    }

    const host = request.headers.get("host") ?? "";
    const tenant = await resolveTenant(host);
    const schoolId = tenant.schoolId ?? request.headers.get("x-tenant-id");
    if (!schoolId) {
      return apiError(400, "Tenant not resolved");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError(422, "Missing file");
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new FileTypeNotAllowedError(file.type);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeError(file.size, MAX_FILE_SIZE);
    }

    const tempEntityId = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = buildStoragePath(
      schoolId,
      "applicant",
      tempEntityId,
      file.name,
    );
    const provider = createStorageProvider();
    const result = await provider.upload(buffer, storagePath, file.type);

    const [record] = await db
      .insert(mediaFiles)
      .values({
        schoolId,
        entityType: "applicant",
        entityId: tempEntityId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        storageProvider: provider.name,
        storagePath,
        uploadedBy: SYSTEM_USER_ID,
      })
      .returning();

    return apiSuccess({
      id: record.id,
      url: result.url,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
