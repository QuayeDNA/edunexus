import { createClient } from 'jsr:@supabase/supabase-js@2';

type ServiceClient = ReturnType<typeof createClient>;
type CursorPayload = { createdAt: string; id: string };

const PLATFORM_ROLES = new Set(['super_admin', 'admin', 'teacher', 'student', 'parent']);
const SCHOOL_SCOPED_ROLES = new Set(['admin', 'teacher', 'student', 'parent']);
const DEACTIVATION_BAN_DURATION = '876000h';

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const toText = (value: unknown) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toLimit = (value: unknown, fallback = 50, max = 200) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
};

const decodeCursor = (value: unknown): CursorPayload | null => {
  const encoded = toText(value);
  if (!encoded) return null;

  try {
    const parsed = JSON.parse(atob(encoded));
    if (typeof parsed?.createdAt !== 'string' || typeof parsed?.id !== 'string') {
      throw new Error('Invalid cursor shape');
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    throw new HttpError(400, 'Invalid pagination cursor.');
  }
};

const encodeCursor = (payload: CursorPayload) => btoa(JSON.stringify(payload));

const applyCreatedAtCursor = (query: any, cursor: CursorPayload | null) => {
  if (!cursor) return query;

  return query.or(
    `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
  );
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  return null;
};

const normalizeRole = (value: unknown) => {
  const role = toText(value)?.toLowerCase();
  if (!role || !PLATFORM_ROLES.has(role)) return null;
  return role;
};

const normalizeSchoolStatus = (value: unknown) => {
  const status = toText(value)?.toLowerCase();
  if (status === 'active' || status === 'suspended') return status;
  return null;
};

const toStatusFilter = (value: unknown) => {
  const text = toText(value);
  if (!text) return null;

  const lower = text.toLowerCase();
  if (lower === 'active') return true;
  if (lower === 'inactive' || lower === 'suspended') return false;
  return null;
};

const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

const displayName = (profile: { first_name?: string | null; last_name?: string | null } | null) => {
  if (!profile) return 'Unknown user';
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return full || 'Unknown user';
};

const ensureRoleValue = (value: unknown) => {
  const role = normalizeRole(value);
  if (!role) {
    throw new HttpError(400, 'Invalid role. Use one of: super_admin, admin, teacher, student, parent.');
  }
  return role;
};

const ensureSchoolStatusValue = (value: unknown) => {
  const status = normalizeSchoolStatus(value);
  if (!status) {
    throw new HttpError(400, 'Invalid school status. Use active or suspended.');
  }
  return status;
};

const ensureEmailValue = (value: unknown) => {
  const email = toText(value)?.toLowerCase();
  if (!email || !email.includes('@')) {
    throw new HttpError(400, 'Valid email is required.');
  }
  return email;
};

const ensureUuidLike = (value: unknown, fieldName: string) => {
  const text = toText(value);
  if (!text) {
    throw new HttpError(400, `${fieldName} is required.`);
  }
  return text;
};

const getProfileById = async (serviceClient: ServiceClient, userId: string) => {
  const { data, error } = await serviceClient
    .from('profiles')
    .select('id, role, is_active, first_name, last_name, school_id')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

const insertAuditEvent = async (
  serviceClient: ServiceClient,
  {
    actorUserId,
    actorName,
    action,
    targetType,
    targetId,
    targetName,
    metadata,
  }: {
    actorUserId: string;
    actorName: string;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    targetName?: string | null;
    metadata?: Record<string, unknown>;
  }
) => {
  const { error } = await serviceClient
    .from('platform_audit_events')
    .insert({
      actor_user_id: actorUserId,
      actor_name: actorName,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      target_name: targetName ?? null,
      metadata: metadata ?? {},
    });

  // If the audit table is missing, let the operation proceed while preserving API availability.
  if (error?.code === '42P01') {
    return;
  }

  if (error) throw error;
};

const getSchoolById = async (serviceClient: ServiceClient, schoolId: string) => {
  const { data, error } = await serviceClient
    .from('schools')
    .select('id, name, country')
    .eq('id', schoolId)
    .single();

  if (error) throw error;
  return data;
};

const setAuthUserBanState = async (serviceClient: ServiceClient, userId: string, isActive: boolean) => {
  const { error } = await serviceClient.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? 'none' : DEACTIVATION_BAN_DURATION,
  });

  if (error) throw error;
};

const revokeAuthSessionsByUserId = async ({
  supabaseUrl,
  serviceRoleKey,
  userId,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
}) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/logout`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    return;
  }

  const detail = await response.text();
  throw new HttpError(
    502,
    `Failed to revoke active user sessions${detail ? `: ${detail}` : ` (status ${response.status})`}.`
  );
};

const ensureSuperAdmin = async (serviceClient: ServiceClient, userId: string) => {
  const profile = await getProfileById(serviceClient, userId);
  return profile?.role === 'super_admin' && profile?.is_active !== false;
};

const handleDashboardSummary = async (serviceClient: ServiceClient) => {
  const [schoolsResult, superAdminsResult, activeUsersResult] = await Promise.all([
    serviceClient.from('schools').select('id', { count: 'exact', head: true }),
    serviceClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin'),
    serviceClient.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  if (schoolsResult.error) throw schoolsResult.error;
  if (superAdminsResult.error) throw superAdminsResult.error;
  if (activeUsersResult.error) throw activeUsersResult.error;

  return jsonResponse(200, {
    data: {
      totals: {
        schools: schoolsResult.count ?? 0,
        platformAdmins: superAdminsResult.count ?? 0,
        activeUsers: activeUsersResult.count ?? 0,
      },
      generated_at: new Date().toISOString(),
    },
  });
};

const handleSchoolsList = async (serviceClient: ServiceClient, payload: Record<string, unknown>) => {
  const search = toText(payload.search);
  const pageSize = toLimit(payload.limit);
  const limit = pageSize + 1;
  const cursor = decodeCursor(payload.cursor);
  const statusFilter = normalizeSchoolStatus(payload.status);

  const buildBaseQuery = () => {
    let query = serviceClient
      .from('schools')
      .select('id, name, country, lifecycle_status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    query = applyCreatedAtCursor(query, cursor);

    if (statusFilter) {
      query = query.eq('lifecycle_status', statusFilter);
    }

    return query;
  };

  let { data, error, count } = await buildBaseQuery();

  // Backward compatibility if lifecycle_status column is not present yet.
  if (error?.code === '42703') {
    let fallbackQuery = serviceClient
      .from('schools')
      .select('id, name, country, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (search) {
      fallbackQuery = fallbackQuery.ilike('name', `%${search}%`);
    }

    fallbackQuery = applyCreatedAtCursor(fallbackQuery, cursor);

    const fallback = await fallbackQuery;
    if (fallback.error) throw fallback.error;

    const fallbackSchools = (fallback.data ?? []).map((school) => ({
      ...school,
      lifecycle_status: 'active',
    }));

    const filteredFallback = statusFilter === 'suspended'
      ? []
      : fallbackSchools;

    data = filteredFallback;
    count = filteredFallback.length;
    error = null;
  }

  if (error) throw error;

  const schools = data ?? [];
  const hasMore = schools.length > pageSize;
  const pageSchools = hasMore ? schools.slice(0, pageSize) : schools;
  const lastRow = pageSchools[pageSchools.length - 1];
  const nextCursor = hasMore && lastRow?.created_at && lastRow?.id
    ? encodeCursor({ createdAt: String(lastRow.created_at), id: String(lastRow.id) })
    : null;
  const schoolIds = pageSchools.map((school) => school.id).filter(Boolean);

  let activeUsersBySchool = new Map<string, number>();
  if (schoolIds.length > 0) {
    const { data: activeProfiles, error: activeProfilesError } = await serviceClient
      .from('profiles')
      .select('school_id')
      .in('school_id', schoolIds)
      .eq('is_active', true);

    if (activeProfilesError) throw activeProfilesError;

    activeUsersBySchool = (activeProfiles ?? []).reduce((acc, row) => {
      const key = row.school_id as string | null;
      if (!key) return acc;
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
  }

  return jsonResponse(200, {
    data: {
      items: pageSchools.map((school) => ({
        id: school.id,
        name: school.name,
        region: school.country,
        status: normalizeSchoolStatus(school.lifecycle_status) ?? 'active',
        active_users: activeUsersBySchool.get(school.id) ?? 0,
        created_at: school.created_at,
      })),
      count: count ?? schools.length,
      next_cursor: nextCursor,
    },
  });
};

const handleUsersList = async (serviceClient: ServiceClient, payload: Record<string, unknown>) => {
  const search = toText(payload.search);
  const role = toText(payload.role);
  const activeFilter = toStatusFilter(payload.status);
  const pageSize = toLimit(payload.limit);
  const limit = pageSize + 1;
  const cursor = decodeCursor(payload.cursor);

  let query = serviceClient
    .from('profiles')
    .select('id, first_name, last_name, role, is_active, school_id, created_at, schools(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  if (role) {
    query = query.eq('role', role);
  }

  if (activeFilter !== null) {
    query = query.eq('is_active', activeFilter);
  }

  query = applyCreatedAtCursor(query, cursor);

  const { data, error, count } = await query;
  if (error) throw error;

  const users = data ?? [];
  const hasMore = users.length > pageSize;
  const pageUsers = hasMore ? users.slice(0, pageSize) : users;
  const lastRow = pageUsers[pageUsers.length - 1];
  const nextCursor = hasMore && lastRow?.created_at && lastRow?.id
    ? encodeCursor({ createdAt: String(lastRow.created_at), id: String(lastRow.id) })
    : null;

  const authUserLookups = await Promise.all(
    pageUsers.map(async (user) => {
      const { data: authUserData, error: authUserError } = await serviceClient.auth.admin.getUserById(user.id);
      if (authUserError) {
        return [user.id, null] as const;
      }
      return [user.id, authUserData?.user ?? null] as const;
    })
  );

  const authUsersById = new Map(authUserLookups);

  return jsonResponse(200, {
    data: {
      items: pageUsers.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: authUsersById.get(user.id)?.email ?? null,
        role: user.role,
        is_active: user.is_active,
        school_name: (user.schools as { name?: string } | null)?.name ?? null,
        last_sign_in_at: authUsersById.get(user.id)?.last_sign_in_at ?? null,
      })),
      count: count ?? users.length,
      next_cursor: nextCursor,
    },
  });
};

const handleAuditList = async (serviceClient: ServiceClient, payload: Record<string, unknown>) => {
  const search = toText(payload.search);
  const limit = toLimit(payload.limit);

  let query = serviceClient
    .from('platform_audit_events')
    .select('id, actor_name, action, target_name, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`action.ilike.%${search}%,actor_name.ilike.%${search}%,target_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error?.code === '42P01') {
    return jsonResponse(200, {
      data: {
        items: [],
        count: 0,
        next_cursor: null,
      },
    });
  }

  if (error) throw error;

  return jsonResponse(200, {
    data: {
      items: data ?? [],
      count: count ?? (data ?? []).length,
      next_cursor: null,
    },
  });
};

const handleSchoolCreate = async (
  serviceClient: ServiceClient,
  payload: Record<string, unknown>,
  actor: { userId: string; name: string }
) => {
  const name = toText(payload.name);
  if (!name || name.length < 3) {
    throw new HttpError(400, 'School name must be at least 3 characters.');
  }

  const insertPayload: Record<string, unknown> = {
    name,
    country: toText(payload.country) ?? 'GH',
  };

  const optionalFields = [
    'email',
    'phone',
    'address',
    'website',
    'motto',
    'curriculum_mode',
    'calendar_mode',
    'grading_system',
    'currency_code',
    'timezone',
  ];

  optionalFields.forEach((field) => {
    const value = toText(payload[field]);
    if (value) insertPayload[field] = value;
  });

  const { data, error } = await serviceClient
    .from('schools')
    .insert(insertPayload)
    .select('id, name, country, created_at')
    .single();

  if (error) throw error;

  await insertAuditEvent(serviceClient, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: 'school.create',
    targetType: 'school',
    targetId: data.id,
    targetName: data.name,
    metadata: {
      country: data.country,
    },
  });

  return jsonResponse(200, {
    data: {
      id: data.id,
      name: data.name,
      country: data.country,
      lifecycle_status: 'active',
      created_at: data.created_at,
    },
  });
};

const handleSchoolSetStatus = async (
  serviceClient: ServiceClient,
  payload: Record<string, unknown>,
  actor: { userId: string; name: string }
) => {
  const schoolId = ensureUuidLike(payload.schoolId, 'schoolId');
  const status = ensureSchoolStatusValue(payload.status);

  const { data: currentSchool, error: currentSchoolError } = await serviceClient
    .from('schools')
    .select('id, name, country, lifecycle_status')
    .eq('id', schoolId)
    .single();

  if (currentSchoolError?.code === '42703') {
    throw new HttpError(400, 'School lifecycle_status column missing. Run migration 016_add_school_lifecycle_status.sql.');
  }

  if (currentSchoolError) throw currentSchoolError;

  const { data: updatedSchool, error: updateError } = await serviceClient
    .from('schools')
    .update({ lifecycle_status: status })
    .eq('id', schoolId)
    .select('id, name, country, lifecycle_status, created_at')
    .single();

  if (updateError?.code === '42703') {
    throw new HttpError(400, 'School lifecycle_status column missing. Run migration 016_add_school_lifecycle_status.sql.');
  }

  if (updateError) throw updateError;

  await insertAuditEvent(serviceClient, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: 'school.set_status',
    targetType: 'school',
    targetId: updatedSchool.id,
    targetName: updatedSchool.name,
    metadata: {
      previous_status: normalizeSchoolStatus(currentSchool.lifecycle_status) ?? 'active',
      new_status: status,
    },
  });

  return jsonResponse(200, {
    data: {
      id: updatedSchool.id,
      name: updatedSchool.name,
      country: updatedSchool.country,
      lifecycle_status: normalizeSchoolStatus(updatedSchool.lifecycle_status) ?? status,
      created_at: updatedSchool.created_at,
    },
  });
};

const handleUserInvite = async (
  serviceClient: ServiceClient,
  payload: Record<string, unknown>,
  actor: { userId: string; name: string }
) => {
  const email = ensureEmailValue(payload.email);
  const role = ensureRoleValue(payload.role);
  const firstName = toText(payload.firstName);
  const lastName = toText(payload.lastName);
  const redirectTo = toText(payload.redirectTo);

  let schoolId: string | null = toText(payload.schoolId);
  let schoolName: string | null = null;

  if (SCHOOL_SCOPED_ROLES.has(role)) {
    if (!schoolId) {
      throw new HttpError(400, 'schoolId is required for school-scoped roles.');
    }
    const school = await getSchoolById(serviceClient, schoolId);
    schoolName = school.name ?? null;
  } else {
    schoolId = null;
  }

  const inviteMetadata: Record<string, unknown> = {
    role,
    school_id: schoolId,
  };

  if (firstName) inviteMetadata.first_name = firstName;
  if (lastName) inviteMetadata.last_name = lastName;

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: inviteMetadata,
      redirectTo: redirectTo ?? undefined,
    }
  );

  if (inviteError) throw inviteError;

  const invitedUserId = inviteData?.user?.id;
  if (!invitedUserId) {
    throw new HttpError(500, 'Invite did not return a user id.');
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert(
      {
        id: invitedUserId,
        school_id: schoolId,
        role,
        first_name: firstName,
        last_name: lastName,
        is_active: true,
      },
      { onConflict: 'id' }
    );

  if (profileError) throw profileError;

  await insertAuditEvent(serviceClient, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: 'user.invite',
    targetType: 'profile',
    targetId: invitedUserId,
    targetName: email,
    metadata: {
      role,
      school_id: schoolId,
    },
  });

  return jsonResponse(200, {
    data: {
      id: invitedUserId,
      email,
      role,
      school_id: schoolId,
      school_name: schoolName,
      first_name: firstName,
      last_name: lastName,
      is_active: true,
    },
  });
};

const handleUserSetStatus = async (
  serviceClient: ServiceClient,
  payload: Record<string, unknown>,
  actor: { userId: string; name: string },
  authAdmin: { supabaseUrl: string; serviceRoleKey: string }
) => {
  const userId = ensureUuidLike(payload.userId, 'userId');
  const isActive = toBoolean(payload.isActive);

  if (isActive === null) {
    throw new HttpError(400, 'isActive must be a boolean.');
  }

  if (actor.userId === userId && !isActive) {
    throw new HttpError(400, 'You cannot deactivate your own account.');
  }

  const { data: existingProfile, error: existingProfileError } = await serviceClient
    .from('profiles')
    .select('id, role, school_id, first_name, last_name, is_active')
    .eq('id', userId)
    .single();

  if (existingProfileError) throw existingProfileError;

  if (existingProfile.role === 'super_admin' && !isActive) {
    const { count, error: remainingSuperAdminsError } = await serviceClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .neq('id', userId);

    if (remainingSuperAdminsError) throw remainingSuperAdminsError;

    if ((count ?? 0) < 1) {
      throw new HttpError(400, 'Cannot deactivate the last active super admin.');
    }
  }

  const { data: updatedProfile, error: updateError } = await serviceClient
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select('id, role, school_id, first_name, last_name, is_active')
    .single();

  if (updateError) throw updateError;

  await setAuthUserBanState(serviceClient, userId, isActive);

  if (!isActive) {
    await revokeAuthSessionsByUserId({
      supabaseUrl: authAdmin.supabaseUrl,
      serviceRoleKey: authAdmin.serviceRoleKey,
      userId,
    });
  }

  await insertAuditEvent(serviceClient, {
    actorUserId: actor.userId,
    actorName: actor.name,
    action: 'user.set_status',
    targetType: 'profile',
    targetId: updatedProfile.id,
    targetName: displayName(updatedProfile),
    metadata: {
      role: updatedProfile.role,
      school_id: updatedProfile.school_id,
      previous_is_active: existingProfile.is_active,
      new_is_active: updatedProfile.is_active,
      auth_ban_duration: isActive ? 'none' : DEACTIVATION_BAN_DURATION,
      sessions_revoked: !isActive,
    },
  });

  return jsonResponse(200, {
    data: updatedProfile,
  });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: { message: 'Method not allowed.' } });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(401, { error: { message: 'Missing Authorization header.' } });
    }

    const supabaseUrl = env('SUPABASE_URL');
    const supabaseAnonKey = env('SUPABASE_ANON_KEY');
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const authAdmin = { supabaseUrl, serviceRoleKey };

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return jsonResponse(401, { error: { message: 'Invalid user session.' } });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const isAuthorized = await ensureSuperAdmin(serviceClient, authData.user.id);

    if (!isAuthorized) {
      return jsonResponse(403, { error: { message: 'Super admin role required.' } });
    }

    const actorProfile = await getProfileById(serviceClient, authData.user.id);
    const actor = {
      userId: authData.user.id,
      name: displayName(actorProfile),
    };

    const body = await req.json().catch(() => ({}));
    const action = toText(body?.action);
    const payload = (body?.payload ?? {}) as Record<string, unknown>;

    if (!action) {
      return jsonResponse(400, { error: { message: 'Missing action.' } });
    }

    switch (action) {
      case 'dashboard.summary':
        return await handleDashboardSummary(serviceClient);
      case 'schools.list':
        return await handleSchoolsList(serviceClient, payload);
      case 'users.list':
        return await handleUsersList(serviceClient, payload);
      case 'audit.list':
        return await handleAuditList(serviceClient, payload);
      case 'schools.create':
        return await handleSchoolCreate(serviceClient, payload, actor);
      case 'schools.set-status':
        return await handleSchoolSetStatus(serviceClient, payload, actor);
      case 'users.invite':
        return await handleUserInvite(serviceClient, payload, actor);
      case 'users.set-status':
        return await handleUserSetStatus(serviceClient, payload, actor, authAdmin);
      default:
        return jsonResponse(400, {
          error: {
            message: `Unsupported action '${action}'.`,
          },
        });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, {
        error: {
          message: error.message,
        },
      });
    }

    console.error('[super-admin-ops] unhandled error', error);
    return jsonResponse(500, {
      error: {
        message: error instanceof Error ? error.message : 'Unexpected server error.',
      },
    });
  }
});
