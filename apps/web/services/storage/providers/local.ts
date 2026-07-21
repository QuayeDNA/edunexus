import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { StorageProvider, UploadResult } from "@edunexus/shared";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir =
      baseDir ??
      process.env.STORAGE_LOCAL_PATH ??
      path.join(process.cwd(), ".edunexus", "storage", "local");
  }

  async upload(
    file: Buffer,
    storagePath: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const fullPath = path.join(this.baseDir, storagePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file);

    const url = `/api/files/serve/${storagePath}`;
    return { url, path: storagePath, mimeType, size: file.length };
  }

  async getSignedUrl(
    storagePath: string,
    _expiresIn: number = 3600,
  ): Promise<string> {
    const signature = crypto
      .createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
      .update(storagePath)
      .update(_expiresIn.toString())
      .digest("hex");
    return `/api/files/serve/${storagePath}?expires=${Date.now() + _expiresIn * 1000}&sig=${signature}`;
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, storagePath);
    await fs.unlink(fullPath);
  }

  async copy(sourcePath: string, destPath: string): Promise<string> {
    const fullSource = path.join(this.baseDir, sourcePath);
    const fullDest = path.join(this.baseDir, destPath);
    await fs.mkdir(path.dirname(fullDest), { recursive: true });
    await fs.cp(fullSource, fullDest);
    return destPath;
  }
}
