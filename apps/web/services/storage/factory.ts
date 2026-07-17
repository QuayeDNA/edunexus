import type { StorageProvider } from "@edunexus/shared";
import { LocalStorageProvider } from "./providers/local";
import { S3StorageProvider } from "./providers/s3";
import { CloudinaryStorageProvider } from "./providers/cloudinary";

export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  switch (provider) {
    case "s3":
      return new S3StorageProvider();
    case "cloudinary":
      return new CloudinaryStorageProvider();
    default:
      return new LocalStorageProvider();
  }
}
