import { auth } from './auth.config';
import type { UserRole } from '@edunexus/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    schoolId: session.user.schoolId,
  };
}
