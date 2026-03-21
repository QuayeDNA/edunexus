import { supabase } from '../supabaseClient';

export const staffApi = {
  list: ({ schoolId, role, department, status, search, page = 0, limit = 50 } = {}) => {
    let q = supabase
      .from('staff')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .range(page * limit, (page + 1) * limit - 1)
      .order('last_name');

    if (role)       q = q.eq('role', role);
    if (department) q = q.eq('department', department);
    if (status)     q = q.eq('employment_status', status);
    if (search)     q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    return q;
  },

  getById: (id) =>
    supabase.from('staff').select('*, profiles(*)').eq('id', id).single(),

  create: (data) =>
    supabase.from('staff').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('staff').update(data).eq('id', id).select().single(),

  delete: (id) =>
    supabase.from('staff').delete().eq('id', id),

  getStats: async (schoolId) => {
    const [{ count: total }, { count: active }, { count: onLeave }] = await Promise.all([
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('employment_status', 'Active'),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('employment_status', 'On Leave'),
    ]);
    return { total, active, onLeave };
  },
};
