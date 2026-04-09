import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { isMissingSuperAdminBackendError, superAdminApi } from '../services/api/superAdmin.js';

const PENDING_HINT = 'Deploy Edge Function `super-admin-ops` to enable live platform data.';

const DASHBOARD_FALLBACK = {
  totals: {
    schools: 0,
    platformAdmins: 0,
    activeUsers: 0,
  },
  generatedAt: null,
  pendingIntegration: true,
  integrationHint: PENDING_HINT,
};

const LIST_FALLBACK = {
  items: [],
  count: 0,
  nextCursor: null,
  pendingIntegration: true,
  integrationHint: PENDING_HINT,
};

const withFallback = async ({ request, fallback }) => {
  try {
    const data = await request();
    return {
      ...data,
      pendingIntegration: false,
      integrationHint: null,
    };
  } catch (error) {
    if (!isMissingSuperAdminBackendError(error)) {
      throw error;
    }

    return fallback;
  }
};

export const SUPER_ADMIN_DASHBOARD_KEY = ['super-admin', 'dashboard'];

export const SUPER_ADMIN_SCHOOLS_KEY = ({ search, status, limit, cursor } = {}) => [
  'super-admin',
  'schools',
  search ?? '',
  status ?? 'all',
  limit ?? 'default',
  cursor ?? 'first',
];

export const SUPER_ADMIN_USERS_KEY = ({ search, role, status, limit, cursor } = {}) => [
  'super-admin',
  'users',
  search ?? '',
  role ?? 'all',
  status ?? 'all',
  limit ?? 'default',
  cursor ?? 'first',
];

export const SUPER_ADMIN_AUDIT_KEY = ({ search, limit } = {}) => [
  'super-admin',
  'audit',
  search ?? '',
  limit ?? 'default',
];

export const useSuperAdminDashboardSummary = () =>
  useQuery({
    queryKey: SUPER_ADMIN_DASHBOARD_KEY,
    queryFn: () => withFallback({
      request: superAdminApi.getDashboardSummary,
      fallback: DASHBOARD_FALLBACK,
    }),
    staleTime: 30_000,
  });

export const useSuperAdminSchools = ({ search, status, limit = 50, cursor } = {}) =>
  useQuery({
    queryKey: SUPER_ADMIN_SCHOOLS_KEY({ search, status, limit, cursor }),
    queryFn: () => withFallback({
      request: () => superAdminApi.listSchools({ search, status, limit, cursor }),
      fallback: LIST_FALLBACK,
    }),
    staleTime: 15_000,
  });

export const useSuperAdminUsers = ({ search, role, status, limit = 50, cursor } = {}) =>
  useQuery({
    queryKey: SUPER_ADMIN_USERS_KEY({ search, role, status, limit, cursor }),
    queryFn: () => withFallback({
      request: () => superAdminApi.listUsers({ search, role, status, limit, cursor }),
      fallback: LIST_FALLBACK,
    }),
    staleTime: 15_000,
  });

export const useSuperAdminAuditEvents = ({ search, limit = 50 } = {}) =>
  useQuery({
    queryKey: SUPER_ADMIN_AUDIT_KEY({ search, limit }),
    queryFn: () => withFallback({
      request: () => superAdminApi.listAuditEvents({ search, limit }),
      fallback: LIST_FALLBACK,
    }),
    staleTime: 15_000,
  });

export const useCreatePlatformSchool = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => superAdminApi.createSchool(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
      toast.success('School created');
    },
    onError: (error) => toast.error(error.message ?? 'Failed to create school'),
  });
};

export const useSetPlatformSchoolStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => superAdminApi.setSchoolStatus(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
      toast.success('School status updated');
    },
    onError: (error) => toast.error(error.message ?? 'Failed to update school status'),
  });
};

export const useInvitePlatformUser = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => superAdminApi.inviteUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
      toast.success('Invitation sent');
    },
    onError: (error) => toast.error(error.message ?? 'Failed to invite user'),
  });
};

export const useSetPlatformUserStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload) => superAdminApi.setUserStatus(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin'] });
      toast.success('User status updated');
    },
    onError: (error) => toast.error(error.message ?? 'Failed to update user status'),
  });
};
