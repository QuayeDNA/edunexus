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
  upload(file: Uint8Array, path: string, mimeType: string): Promise<UploadResult>;
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
