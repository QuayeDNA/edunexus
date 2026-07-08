import { auth } from './auth.config';
import { redirect } from 'next/navigation';
import type { UserRole } from '@edunexus/shared';
import { ROLE_ROUTES } from '@edunexus/shared';

export async function requireRole(...roles: UserRole[]) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!roles.includes(session.user.role)) {
    redirect(ROLE_ROUTES[session.user.role] ?? '/');
  }

  return session;
}
