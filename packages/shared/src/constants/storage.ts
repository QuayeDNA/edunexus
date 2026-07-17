import type { EntityType, FilePermission } from "../types/storage";

export function buildStoragePath(
  schoolId: string,
  entityType: EntityType,
  entityId: string,
  fileName: string,
): string {
  const uuid = globalThis.crypto.randomUUID();
  return `${schoolId}/${entityType}/${entityId}/${uuid}-${fileName}`;
}

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const STORAGE_PERMISSIONS: FilePermission[] = [
  {
    entityType: "school",
    role: "super_admin",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "school",
    role: "admin",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "profile",
    role: "super_admin",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "profile",
    role: "admin",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "profile",
    role: "teacher",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "profile",
    role: "student",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "profile",
    role: "parent",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "applicant",
    role: "super_admin",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "applicant",
    role: "admin",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "student",
    role: "super_admin",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "student",
    role: "admin",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "student",
    role: "teacher",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "student",
    role: "student",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "student",
    role: "parent",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "staff",
    role: "super_admin",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "staff",
    role: "admin",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "staff",
    role: "teacher",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "library",
    role: "super_admin",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "library",
    role: "admin",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "library",
    role: "teacher",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  {
    entityType: "library",
    role: "student",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "library",
    role: "parent",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "expense",
    role: "super_admin",
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    entityType: "expense",
    role: "admin",
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
];

export function checkFilePermission(
  entityType: EntityType,
  role: string,
  action: "read" | "write" | "delete",
): boolean {
  const perm = STORAGE_PERMISSIONS.find(
    (p) => p.entityType === entityType && p.role === role,
  );
  if (!perm) return false;
  if (action === "read") return perm.canRead;
  if (action === "write") return perm.canWrite;
  if (action === "delete") return perm.canDelete;
  return false;
}
