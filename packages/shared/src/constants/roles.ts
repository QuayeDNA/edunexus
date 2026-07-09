import type { UserRole } from '../types/common';

export const ROLES: Record<string, UserRole> = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
} as const;

export const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: '/dashboard',
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

export const ROLE_HIERARCHY: UserRole[] = [
  'super_admin',
  'admin',
  'teacher',
  'parent',
  'student',
];