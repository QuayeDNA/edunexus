import { NextRequest } from "next/server";
import { requireRole } from "@/lib/api/require-role";
import { apiError, apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { createStorageProvider } from "@/services/storage";
import {
  FileTypeNotAllowedError,
  FileTooLargeError,
} from "@/services/storage/errors";
import { db } from "@/lib/db/client";
import { mediaFiles } from "@edunexus/database";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  buildStoragePath,
  checkFilePermission,
} from "@edunexus/shared";

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireRole(
      "admin",
      "teacher",
      "student",
      "parent",
    );
    if (error || !user) return error!;

    const schoolId = request.headers.get("x-tenant-id");
    if (!schoolId) return apiError(400, "Tenant not resolved");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file || !entityType || !entityId) {
      return apiError(
        422,
        "Missing required fields: file, entityType, entityId",
      );
    }

    if (!checkFilePermission(entityType as any, user.role, "write")) {
      return apiError(
        403,
        "Forbidden: insufficient permissions for this entity type",
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new FileTypeNotAllowedError(file.type);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeError(file.size, MAX_FILE_SIZE);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = buildStoragePath(
      schoolId,
      entityType as any,
      entityId,
      file.name,
    );
    const provider = createStorageProvider();
    const result = await provider.upload(buffer, storagePath, file.type);

    const [record] = await db
      .insert(mediaFiles)
      .values({
        schoolId,
        entityType: entityType as string,
        entityId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        storageProvider: provider.name,
        storagePath,
        uploadedBy: user.id,
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
