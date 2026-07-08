'use client';

import { useSession } from 'next-auth/react';
import type { UserRole } from '@edunexus/shared';

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const user: CurrentUser | null = isAuthenticated && session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as UserRole,
        schoolId: session.user.schoolId ?? null,
      }
    : null;

  return { user, isAuthenticated, isLoading };
}
