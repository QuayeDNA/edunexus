import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { handleApiError } from '@/lib/api/errors';
import { db } from '@/lib/db/client';
import { mediaFiles } from '@edunexus/database';
import { checkFilePermission } from '@edunexus/shared';

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

    const { createStorageProvider } = await import('@/services/storage');
    const provider = createStorageProvider();
    const signedUrl = await provider.getSignedUrl(record.storagePath);

    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    return handleApiError(error);
  }
}
