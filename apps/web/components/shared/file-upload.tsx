'use client';

import { useState, useCallback, useRef } from 'react';
import type { EntityType } from '@edunexus/shared';

interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface FileUploadProps {
  entityType: EntityType;
  entityId: string;
  accept?: string;
  maxFiles?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
}

export function FileUpload({
  entityType,
  entityId,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  maxFiles = 5,
  onUploadComplete,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;

      setUploading(true);
      setError('');
      const uploaded: UploadedFile[] = [];

      for (const file of Array.from(fileList)) {
        if (files.length + uploaded.length >= maxFiles) break;

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('entityType', entityType);
          formData.append('entityId', entityId);

          const res = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          });

          const json = await res.json();
          if (!res.ok) {
            setError(json.error ?? 'Upload failed');
            break;
          }

          uploaded.push(json.data);
        } catch {
          setError('Network error during upload');
          break;
        }
      }

      const allFiles = [...files, ...uploaded];
      setFiles(allFiles);
      onUploadComplete?.(allFiles);
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [entityType, entityId, files, maxFiles, onUploadComplete],
  );

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

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

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map(f => (
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
