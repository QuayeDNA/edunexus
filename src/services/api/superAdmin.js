import { supabase } from '../supabaseClient.js';

const SUPER_ADMIN_FUNCTION_NAME = 'super-admin-ops';

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const toOptionalText = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toFullName = (row = {}) => {
  const direct = toOptionalText(row.full_name ?? row.fullName ?? row.name);
  if (direct) return direct;

  const composed = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return composed || 'Unknown user';
};

const normalizeInvokeError = (error, action) => {
  const message =
    error?.message ??
    error?.error_description ??
    `Super admin operation failed (${action}).`;

  const normalized = new Error(message);
  normalized.code = error?.code ?? error?.status ?? 'SUPER_ADMIN_OPERATION_FAILED';
  return normalized;
};

export const isMissingSuperAdminBackendError = (error) => {
  const text = String(error?.message ?? '').toLowerCase();

  const missingFunction = text.includes('edge function') && (text.includes('404') || text.includes('not found'));
  const missingRoute = text.includes('failed to send a request to the edge function');

  return missingFunction || missingRoute;
};

const invokeSuperAdminOperation = async (action, payload = {}) => {
  const { data, error } = await supabase.functions.invoke(SUPER_ADMIN_FUNCTION_NAME, {
    body: {
      action,
      payload,
    },
  });

  if (error) {
    throw normalizeInvokeError(error, action);
  }

  if (data?.error) {
    throw normalizeInvokeError(data.error, action);
  }

  return data?.data ?? data ?? {};
};

const normalizeDashboardSummary = (raw = {}) => ({
  totals: {
    schools: toNumber(raw?.totals?.schools ?? raw?.schools_total),
    platformAdmins: toNumber(raw?.totals?.platformAdmins ?? raw?.platform_admins_total),
    activeUsers: toNumber(raw?.totals?.activeUsers ?? raw?.active_users_total),
  },
  generatedAt: raw?.generatedAt ?? raw?.generated_at ?? null,
});

const normalizeSchool = (row = {}) => ({
  id: row.id ?? null,
  name: toOptionalText(row.name) ?? 'Unnamed school',
  region: toOptionalText(row.region ?? row.country),
  status: toOptionalText(row.status ?? row.lifecycle_status) ?? 'active',
  activeUsers: toNumber(row.active_users ?? row.activeUsers),
  createdAt: row.created_at ?? row.createdAt ?? null,
});

const normalizeSchoolsResponse = (raw = {}) => ({
  items: toArray(raw?.items ?? raw?.schools).map(normalizeSchool),
  count: toNumber(raw?.count ?? raw?.total),
  nextCursor: raw?.nextCursor ?? raw?.next_cursor ?? null,
});

const normalizeUser = (row = {}) => ({
  id: row.id ?? row.user_id ?? null,
  email: toOptionalText(row.email),
  fullName: toFullName(row),
  role: toOptionalText(row.role) ?? 'unknown',
  schoolName: toOptionalText(row.school_name ?? row.schoolName),
  isActive: row.is_active ?? row.isActive ?? true,
  lastSignInAt: row.last_sign_in_at ?? row.lastSignInAt ?? null,
});

const normalizeUsersResponse = (raw = {}) => ({
  items: toArray(raw?.items ?? raw?.users).map(normalizeUser),
  count: toNumber(raw?.count ?? raw?.total),
  nextCursor: raw?.nextCursor ?? raw?.next_cursor ?? null,
});

const normalizeAuditEvent = (row = {}) => ({
  id: row.id ?? null,
  action: toOptionalText(row.action) ?? 'unknown_action',
  actorName: toOptionalText(row.actor_name ?? row.actorName) ?? 'System',
  targetName: toOptionalText(row.target_name ?? row.targetName),
  createdAt: row.created_at ?? row.createdAt ?? null,
  metadata: row.metadata ?? {},
});

const normalizeAuditResponse = (raw = {}) => ({
  items: toArray(raw?.items ?? raw?.events).map(normalizeAuditEvent),
  count: toNumber(raw?.count ?? raw?.total),
  nextCursor: raw?.nextCursor ?? raw?.next_cursor ?? null,
});

export const superAdminApi = {
  getDashboardSummary: async () => {
    const raw = await invokeSuperAdminOperation('dashboard.summary');
    return normalizeDashboardSummary(raw);
  },

  listSchools: async ({ search, status, limit = 50, cursor } = {}) => {
    const raw = await invokeSuperAdminOperation('schools.list', {
      search: toOptionalText(search),
      status: toOptionalText(status),
      limit,
      cursor,
    });

    return normalizeSchoolsResponse(raw);
  },

  listUsers: async ({ search, role, status, limit = 50, cursor } = {}) => {
    const raw = await invokeSuperAdminOperation('users.list', {
      search: toOptionalText(search),
      role: toOptionalText(role),
      status: toOptionalText(status),
      limit,
      cursor,
    });

    return normalizeUsersResponse(raw);
  },

  listAuditEvents: async ({ search, limit = 50, cursor } = {}) => {
    const raw = await invokeSuperAdminOperation('audit.list', {
      search: toOptionalText(search),
      limit,
      cursor,
    });

    return normalizeAuditResponse(raw);
  },

  createSchool: (payload) => invokeSuperAdminOperation('schools.create', payload),

  setSchoolStatus: (payload) => invokeSuperAdminOperation('schools.set-status', payload),

  inviteUser: (payload) => invokeSuperAdminOperation('users.invite', payload),

  setUserStatus: (payload) => invokeSuperAdminOperation('users.set-status', payload),
};
