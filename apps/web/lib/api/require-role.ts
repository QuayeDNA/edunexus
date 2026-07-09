import { auth } from '@/lib/auth/auth.config';
import type { UserRole } from '@edunexus/shared';
import { apiError } from './response';

export async function requireRole(...roles: UserRole[]) {
  const session = await auth();
  if (!session?.user) {
    return { error: apiError(401, 'Unauthorized'), user: null as const };
  }
  if (!roles.includes(session.user.role as UserRole)) {
    return { error: apiError(403, 'Forbidden: insufficient permissions'), user: null as const };
  }
  return { error: null, user: session.user as { id: string; role: UserRole; schoolId: string | null; email: string; name: string } };
}
