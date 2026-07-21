"use client";

import { useState, useCallback, useRef } from "react";
import type { EntityType } from "@edunexus/shared";

interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface PendingFile {
  file: File;
  name: string;
  size: number;
}

interface FileUploadProps {
  entityType: EntityType;
  entityId: string;
  accept?: string;
  maxFiles?: number;
  uploadUrl?: string;
  tenantId?: string;
  autoUpload?: boolean;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onFilesPending?: (files: PendingFile[]) => void;
}

export function FileUpload({
  entityType,
  entityId,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  maxFiles = 5,
  uploadUrl = "/api/files/upload",
  tenantId,
  autoUpload = true,
  onUploadComplete,
  onFilesPending,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;

      setError("");

      if (autoUpload) {
        setUploading(true);
        const uploaded: UploadedFile[] = [];

        for (const file of Array.from(fileList)) {
          if (files.length + uploaded.length >= maxFiles) break;

          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("entityType", entityType);
            formData.append("entityId", entityId);

            const headers: Record<string, string> = {};
            if (tenantId) {
              headers["x-tenant-id"] = tenantId;
            }

            const res = await fetch(uploadUrl, {
              method: "POST",
              headers,
              body: formData,
            });

            const json = await res.json();
            if (!res.ok) {
              setError(json.error ?? "Upload failed");
              break;
            }

            uploaded.push(json.data);
          } catch {
            setError("Network error during upload");
            break;
          }
        }

        const allFiles = [...files, ...uploaded];
        setFiles(allFiles);
        onUploadComplete?.(allFiles);
        setUploading(false);
      } else {
        const selected: PendingFile[] = [];
        for (const file of Array.from(fileList)) {
          if (pendingFiles.length + selected.length >= maxFiles) break;
          selected.push({ file, name: file.name, size: file.size });
        }
        const allPending = [...pendingFiles, ...selected];
        setPendingFiles(allPending);
        onFilesPending?.(allPending);
        onUploadComplete?.([]);
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [
      autoUpload,
      entityType,
      entityId,
      files,
      maxFiles,
      tenantId,
      uploadUrl,
      onUploadComplete,
      onFilesPending,
      pendingFiles,
    ],
  );

  const removeFile = (id: string) => {
    if (autoUpload) {
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } else {
      const updated = pendingFiles.filter((f) => f.name !== id);
      setPendingFiles(updated);
      onFilesPending?.(updated);
    }
  };

  const displayFiles = autoUpload ? files : [];

  return (
    <div className="space-y-3">
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading ? (
          <p className="text-sm text-muted-foreground">Uploading...</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPEG, PNG up to 10 MB (max {maxFiles} files)
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!autoUpload && pendingFiles.length > 0 && (
        <ul className="space-y-2">
          {pendingFiles.map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
            >
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                className="ml-2 text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {displayFiles.length > 0 && (
        <ul className="space-y-2">
          {displayFiles.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
            >
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary underline"
              >
                {f.fileName}
              </a>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="ml-2 text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
