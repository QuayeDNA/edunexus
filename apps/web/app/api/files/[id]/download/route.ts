import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { requireRole } from '@/lib/api/require-role';
import { NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { handleApiError } from '@/lib/api/errors';
import { db } from '@/lib/db/client';
import { mediaFiles } from '@edunexus/database';
import { checkFilePermission } from '@edunexus/shared';

const FILE_EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = await requireRole('admin', 'teacher', 'student', 'parent', 'super_admin');
    if (error || !user) return error!;

    const [record] = await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.id, id))
      .limit(1);

    if (!record) throw new NotFoundError('File');

    if (!checkFilePermission(record.entityType as any, user.role, 'read')) {
      throw new ForbiddenError('Insufficient permissions to read this file');
    }

    const ext = record.fileName.split('.').pop()?.toLowerCase() ?? '';
    const contentType = record.mimeType !== 'application/octet-stream'
      ? record.mimeType
      : (FILE_EXT_TO_MIME[ext] ?? 'application/octet-stream');

    if (record.storageProvider === 'local') {
      const baseDir = process.env.STORAGE_LOCAL_PATH
        ?? path.join(process.cwd(), '.edunexus', 'storage', 'local');
      const filePath = path.join(baseDir, record.storagePath);

      const content = await fs.readFile(filePath);

      return new NextResponse(content, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${record.fileName}"`,
          'Content-Length': String(content.length),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const { createStorageProvider } = await import('@/services/storage');
    const provider = createStorageProvider();
    const signedUrl = await provider.getSignedUrl(record.storagePath, 3600);

    const absoluteUrl = signedUrl.startsWith('http')
      ? signedUrl
      : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${signedUrl}`;

    return NextResponse.redirect(absoluteUrl, 302);
  } catch (error) {
    return handleApiError(error);
  }
}
