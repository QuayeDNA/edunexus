import { supabase } from '../supabaseClient';

export const gradeLevelsApi = {
  list: (schoolId) =>
    supabase
      .from('grade_levels')
      .select('*')
      .eq('school_id', schoolId)
      .order('order_index', { ascending: true }),

  bulkCreate: (levels) =>
    supabase.from('grade_levels').insert(levels).select(),

  update: (id, data) =>
    supabase.from('grade_levels').update(data).eq('id', id).select().single(),

  delete: (id) =>
    supabase.from('grade_levels').delete().eq('id', id),
};
