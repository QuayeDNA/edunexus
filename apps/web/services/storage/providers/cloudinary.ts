import { v2 as cloudinary } from "cloudinary";
import type { StorageProvider, UploadResult } from "@edunexus/shared";

export class CloudinaryStorageProvider implements StorageProvider {
  readonly name = "cloudinary";

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(
    file: Buffer,
    storagePath: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const resourceType = mimeType.startsWith("image/") ? "image" : "raw";
    const publicId = storagePath.replace(/\.[^.]+$/, "");

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          folder: "",
        },
        (error, result) => {
          if (error || !result) {
            reject(new Error(error?.message ?? "Cloudinary upload failed"));
            return;
          }
          resolve({
            url: result.secure_url,
            path: storagePath,
            mimeType,
            size: file.length,
          });
        },
      );
      uploadStream.end(file);
    });
  }

  async getSignedUrl(
    storagePath: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const publicId = storagePath.replace(/\.[^.]+$/, "");
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      type: "upload",
      resource_type: "image",
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    });
  }

  async delete(storagePath: string): Promise<void> {
    const publicId = storagePath.replace(/\.[^.]+$/, "");
    await cloudinary.uploader.destroy(publicId);
  }

  async copy(sourcePath: string, destPath: string): Promise<string> {
    const sourcePublicId = sourcePath.replace(/\.[^.]+$/, "");
    const destPublicId = destPath.replace(/\.[^.]+$/, "");
    await cloudinary.uploader.rename(sourcePublicId, destPublicId);
    return destPath;
  }
}
