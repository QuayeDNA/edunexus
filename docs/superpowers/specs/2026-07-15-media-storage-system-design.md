# Media Storage System — Design

> 2026-07-15

## Scope

Design and implement a reusable media storage foundation for EduNexus: a `StorageProvider` adapter interface with three implementations (S3 for production, Cloudinary for preview/staging, local disk for dev/testing), a central `media_files` database table for tracking, RBAC-enforced file API routes, and a shared UI upload component — so every phase going forward (applicant docs, student photos, staff records, library files, expense receipts) uses the same pattern.

---

## Layer Architecture

```
@edunexus/shared              Pure types + constants + pure functions
@edunexus/database            Drizzle schema (media_files table)
apps/web/services/storage     Provider implementations (AWS SDK, Cloudinary SDK, fs)
apps/web/app/api/files/*      REST endpoints with requireRole()
apps/web/components/shared    Reusable upload component
```

---

## 1. `@edunexus/shared` — Interfaces & Constants

### New file: `packages/shared/src/types/storage.ts`

```typescript
export type EntityType =
  | 'school'
  | 'profile'
  | 'applicant'
  | 'student'
  | 'staff'
  | 'library'
  | 'expense';

export interface MediaFile {
  id: string;
  schoolId: string;
  entityType: EntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageProvider: 's3' | 'cloudinary' | 'local';
  storagePath: string;
  checksum?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface UploadResult {
  url: string;
  path: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  readonly name: string;
  upload(file: Buffer, path: string, mimeType: string): Promise<UploadResult>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  delete(path: string): Promise<void>;
  copy(sourcePath: string, destPath: string): Promise<string>;
}

export interface FilePermission {
  entityType: EntityType;
  role: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}
```

### New file: `packages/shared/src/constants/storage.ts`

**Path convention** (pure function, no deps):

```
{schoolId}/{entityType}/{entityId}/{uuid-v4}-{originalName}
```

Example: `abc123def/applicant/xyz789/0195f2c0-birth-certificate.pdf`

```typescript
export function buildStoragePath(
  schoolId: string,
  entityType: EntityType,
  entityId: string,
  fileName: string,
): string {
  const uuid = crypto.randomUUID();
  return `${schoolId}/${entityType}/${entityId}/${uuid}-${fileName}`;
}
```

**MIME type allowlist:**

```typescript
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
```

**Extension points for future media-heavy types** (documented inline, not implemented):
- `IMAGE_HEAVY_EXTENSIONS: 'image/gif', 'image/svg+xml'`
- `VIDEO_EXTENSIONS: 'video/mp4', 'video/webm'`
- `MEDIA_MAX_FILE_SIZE: 100 * 1024 * 1024`

### RBAC Permission Matrix

```typescript
export const STORAGE_PERMISSIONS: FilePermission[] = [
  // school logo
  { entityType: 'school',    role: 'super_admin', canRead: true, canWrite: true,  canDelete: true  },
  { entityType: 'school',    role: 'admin',       canRead: true, canWrite: true,  canDelete: true  },
  // profile avatar
  { entityType: 'profile',   role: 'super_admin', canRead: true, canWrite: false, canDelete: false },
  { entityType: 'profile',   role: 'admin',       canRead: true, canWrite: false, canDelete: false },
  { entityType: 'profile',   role: 'teacher',     canRead: true, canWrite: true,  canDelete: true  },
  { entityType: 'profile',   role: 'student',     canRead: true, canWrite: true,  canDelete: true  },
  { entityType: 'profile',   role: 'parent',      canRead: true, canWrite: true,  canDelete: true  },
  // applicant docs
  { entityType: 'applicant', role: 'super_admin', canRead: true, canWrite: false, canDelete: false },
  { entityType: 'applicant', role: 'admin',       canRead: true, canWrite: true,  canDelete: true  },
  // student records
  { entityType: 'student',   role: 'super_admin', canRead: true, canWrite: false, canDelete: false },
  { entityType: 'student',   role: 'admin',       canRead: true, canWrite: true,  canDelete: true  },
  { entityType: 'student',   role: 'teacher',     canRead: true, canWrite: false, canDelete: false },
  { entityType: 'student',   role: 'student',     canRead: true, canWrite: false, canDelete: false },
  { entityType: 'student',   role: 'parent',      canRead: true, canWrite: false, canDelete: false },
  // staff records
  { entityType: 'staff',     role: 'super_admin', canRead: true, canWrite: false, canDelete: false },
  { entityType: 'staff',     role: 'admin',       canRead: true, canWrite: true,  canDelete: true  },
  { entityType: 'staff',     role: 'teacher',     canRead: true, canWrite: false, canDelete: false },
  // library files
  { entityType: 'library',   role: 'super_admin', canRead: true, canWrite: false, canDelete: false },
  { entityType: 'library',   role: 'admin',       canRead: true, canWrite: true,  canDelete: true  },
  { entityType: 'library',   role: 'teacher',     canRead: true, canWrite: true,  canDelete: true  },
  { entityType: 'library',   role: 'student',     canRead: true, canWrite: false, canDelete: false },
  { entityType: 'library',   role: 'parent',      canRead: true, canWrite: false, canDelete: false },
  // expense receipts
  { entityType: 'expense',   role: 'super_admin', canRead: true, canWrite: false, canDelete: false },
  { entityType: 'expense',   role: 'admin',       canRead: true, canWrite: true,  canDelete: true  },
];
```

> **Two-layer access control:** The permission matrix is the first gate (role-level). Route handlers add a second gate: entity ownership. For example, a `student` role grants `canRead: true` for entity type `student`, but the download handler also verifies `entityId` matches the requesting user's own student record. This second layer is enforced per-route, not in the matrix.

Plus a lookup helper:

```typescript
export function checkFilePermission(
  entityType: EntityType,
  role: string,
  action: 'read' | 'write' | 'delete',
): boolean {
  const perm = STORAGE_PERMISSIONS.find(
    p => p.entityType === entityType && p.role === role,
  );
  if (!perm) return false;
  if (action === 'read') return perm.canRead;
  if (action === 'write') return perm.canWrite;
  if (action === 'delete') return perm.canDelete;
  return false;
}
```

### Re-export

Add to `packages/shared/src/index.ts`:
- `StorageProvider`, `EntityType`, `MediaFile`, `UploadResult`, `FilePermission`
- `buildStoragePath`, `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE`, `STORAGE_PERMISSIONS`, `checkFilePermission`

---

## 2. `@edunexus/database` — `media_files` Table

### New file: `packages/database/src/schema/media-files.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `school_id` | `uuid references schools(id) not null` | Tenant-scoped |
| `entity_type` | `varchar(50) not null` | `school`, `profile`, `applicant`, `student`, `staff`, `library`, `expense` |
| `entity_id` | `uuid not null` | The record's ID in the entity table |
| `file_name` | `varchar(255) not null` | Original filename |
| `mime_type` | `varchar(100) not null` | MIME type from upload |
| `size` | `integer not null` | Bytes |
| `storage_provider` | `varchar(20) not null` | `s3`, `cloudinary`, `local` |
| `storage_path` | `text not null` | Provider-relative path |
| `checksum` | `varchar(64)` | SHA-256 hex |
| `uploaded_by` | `uuid not null references profiles(id)` | Who uploaded |
| `created_at` | `timestamptz default now() not null` | |
| `deleted_at` | `timestamptz` | Soft delete |

Indexes: `(school_id)`, `(entity_type, entity_id)`, `(uploaded_by)`, composite `(school_id, entity_type, entity_id)`.

Add export to `packages/database/src/schema/index.ts`.

---

## 3. `apps/web/services/storage/` — Provider Implementations

### Provider interface (in shared, referenced here)

Each provider class implements `StorageProvider` from `@edunexus/shared`.

### `LocalStorageProvider`

- Base directory: `process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), '.edunexus/storage/local')`
- `upload(file, path)`: writes buffer to `{baseDir}/{path}`, ensures parent dirs exist
- `getSignedUrl(path)`: returns the path as a query-signed URL via a Next.js API endpoint (proxy route at `/api/files/serve/{path}`) — simple token-based expiry
- `delete(path)`: removes file from disk
- `copy(source, dest)`: copies file on disk

### `CloudinaryStorageProvider`

- Uses `cloudinary` npm package (to be added)
- Config from env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `upload(file, path, mimeType)`: uploads to Cloudinary, uses `path` as the `public_id` with folder structure preserved
- `getSignedUrl(path)`: returns a Cloudinary delivery URL with optional expiry via `resource_type` detection
- `delete(path)`: destroys the asset by `public_id`
- `copy(source, dest)`: copies by uploading fetched from source URL

### `S3StorageProvider`

- Uses `@aws-sdk/client-s3` (to be added)
- Config from env: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_REGION`
- `upload(file, path, mimeType)`: `PutObjectCommand` with `ContentType`, returns the object key
- `getSignedUrl(path)`: `GetObjectCommand` with `presign` from `@aws-sdk/s3-request-presigner`, default 1-hour expiry
- `delete(path)`: `DeleteObjectCommand`
- `copy(source, dest)`: `CopyObjectCommand`

### Factory: `services/storage/factory.ts`

```typescript
export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? 'local';
  switch (provider) {
    case 's3':   return new S3StorageProvider();
    case 'cloudinary': return new CloudinaryStorageProvider();
    default:     return new LocalStorageProvider();
  }
}
```

Inferred fallback: if `NODE_ENV === 'production'` and no `STORAGE_PROVIDER` is set, default to `cloudinary` (preview) or `s3` (production). Local for dev/test.

---

## 4. API Routes

All routes are behind `/api/files` and use the standard `requireRole()` + `routeHandler()` wrappers.

### `POST /api/files/upload`

- Auth: any authenticated role (permission checked per entity type on write)
- Body: `multipart/form-data` with `file` (binary), `entityType`, `entityId`
- Steps:
  1. `requireRole()` → get user + schoolId from headers
  2. `checkFilePermission(entityType, user.role, 'write')` → 403 if denied
  3. Validate file: MIME type in `ALLOWED_MIME_TYPES`, size ≤ `MAX_FILE_SIZE`
  4. `buildStoragePath(schoolId, entityType, entityId, file.name)` → path
  5. `provider.upload(buffer, path, mimeType)` → result
  6. Insert `media_files` row
  7. Return `{ id, url, fileName, mimeType, size }`

### `GET /api/files/:id`

- Auth: any authenticated role
- Returns `media_files` metadata row (no file bytes)

### `GET /api/files/:id/download`

- Auth: any authenticated role
- Fetch `media_files` row → `checkFilePermission(entityType, role, 'read')` → 403 if denied
- `provider.getSignedUrl(storagePath)` → 302 redirect to signed URL

### `DELETE /api/files/:id`

- Auth: any authenticated role
- `checkFilePermission(entityType, role, 'delete')` → 403 if denied
- `provider.delete(storagePath)` → soft-delete `media_files` row

---

## 5. Upload UI Component

### `apps/web/components/shared/file-upload.tsx`

A reusable shadcn-based upload component:

- Props: `entityType: EntityType`, `entityId: string`, `accept?: string`, `maxFiles?: number`
- Drag-and-drop zone using native HTML drag events
- Uploads directly to `POST /api/files/upload` with progress tracking
- Returns array of `{ id, url, fileName }` on success
- Handles error states, loading states, file type/size validation client-side

---

## 6. Env Variables

| Variable | Used by | Required for |
|---|---|---|
| `STORAGE_PROVIDER` | factory | All — `local`, `cloudinary`, or `s3` |
| `STORAGE_LOCAL_PATH` | LocalProvider | Dev (defaults to `.edunexus/storage/local`) |
| `CLOUDINARY_CLOUD_NAME` | CloudinaryProvider | Preview/staging |
| `CLOUDINARY_API_KEY` | CloudinaryProvider | Preview/staging |
| `CLOUDINARY_API_SECRET` | CloudinaryProvider | Preview/staging |
| `STORAGE_ENDPOINT` | S3Provider | Production (S3-compatible) |
| `STORAGE_ACCESS_KEY` | S3Provider | Production |
| `STORAGE_SECRET_KEY` | S3Provider | Production |
| `STORAGE_BUCKET` | S3Provider | Production |
| `STORAGE_REGION` | S3Provider | Production |

Existing `NEXT_PUBLIC_*` Cloudinary vars in `.env` are deprecated — uploads go through the backend, not direct browser-to-Cloudinary.

---

## 7. Migration Plan

1. **Create `media_files` table** — new migration
2. **Create storage service** in `@edunexus/shared` + `apps/web/services/storage/`
3. **Create API routes** at `/api/files/*`
4. **Create upload component**
5. **Migrate existing data** (future task, not in initial scope):
   - `schools.logo` → copy to storage, create `media_files` record, add FK
   - `profiles.avatar` → same pattern
   - `applicants.document_urls` → bridge pattern: new uploads use new flow, existing URLs stay as-is until [3a.2.1] conversion

---

## 8. Acceptance Criteria

1. Given a dev environment, when a file is uploaded via `POST /api/files/upload`, it is stored on local disk under `.edunexus/storage/local/{schoolId}/{entityType}/{entityId}/` and a `media_files` row is created
2. Given a production environment, when a file is uploaded, it is stored in S3 and a `media_files` row is created
3. Given a preview/staging environment, when a file is uploaded, it is stored in Cloudinary and a `media_files` row is created
4. When a user requests a file download, they receive a 302 redirect to a signed/time-limited URL
5. When a user without read permission requests a file, they receive a 403
6. When a user uploads an unsupported file type, they receive a 422
7. When a user uploads a file exceeding 10 MB, they receive a 422
8. When a user deletes a file, the `media_files` row is soft-deleted and the storage provider `delete()` is called
9. The `buildStoragePath()` function produces consistent, UUID-prefixed paths
