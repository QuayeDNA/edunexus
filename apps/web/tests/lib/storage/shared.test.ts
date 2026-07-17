import { describe, it, expect } from "vitest";
import {
  buildStoragePath,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  checkFilePermission,
} from "@edunexus/shared";

describe("buildStoragePath", () => {
  it("returns path with schoolId/entityType/entityId/uuid-filename format", () => {
    const path = buildStoragePath(
      "school-1",
      "applicant",
      "entity-1",
      "doc.pdf",
    );
    expect(path).toMatch(/^school-1\/applicant\/entity-1\/[\w-]+-doc\.pdf$/);
  });
});

describe("ALLOWED_MIME_TYPES", () => {
  it("allows PDF and common image types", () => {
    expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true);
  });

  it("rejects video and other types", () => {
    expect(ALLOWED_MIME_TYPES.has("video/mp4")).toBe(false);
    expect(ALLOWED_MIME_TYPES.has("text/html")).toBe(false);
  });
});

describe("MAX_FILE_SIZE", () => {
  it("is 10 MB", () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});

describe("checkFilePermission", () => {
  it("allows admin to write applicant files", () => {
    expect(checkFilePermission("applicant", "admin", "write")).toBe(true);
  });

  it("denies student from writing applicant files", () => {
    expect(checkFilePermission("applicant", "student", "write")).toBe(false);
  });

  it("allows student to read own profile", () => {
    expect(checkFilePermission("profile", "student", "read")).toBe(true);
  });

  it("denies teacher from deleting school files", () => {
    expect(checkFilePermission("school", "teacher", "delete")).toBe(false);
  });

  it("returns false for unknown entity type", () => {
    expect(checkFilePermission("school" as any, "ghost", "read")).toBe(false);
  });
});
