import { supabase } from '../supabaseClient';

export const academicYearsApi = {
  list: (schoolId) =>
    supabase
      .from('academic_years')
      .select('*, terms(*)')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false }),

  getCurrent: (schoolId) =>
    supabase
      .from('academic_years')
      .select('*, terms(*)')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single(),

  create: (data) =>
    supabase.from('academic_years').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('academic_years').update(data).eq('id', id).select().single(),

  deleteYear: (id) =>
    supabase.from('academic_years').delete().eq('id', id),

  setCurrent: async (id, schoolId) => {
    // Unset all, then set this one
    const { error: resetError } = await supabase
      .from('academic_years')
      .update({ is_current: false })
      .eq('school_id', schoolId);

    if (resetError) {
      return { data: null, error: resetError };
    }

    return supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', id)
      .select()
      .single();
  },

  createTerm: (data) =>
    supabase.from('terms').insert(data).select().single(),

  updateTerm: (id, data) =>
    supabase.from('terms').update(data).eq('id', id).select().single(),

  deleteTerm: (id) =>
    supabase.from('terms').delete().eq('id', id),

  setCurrentTerm: async (id, schoolId) => {
    const { error: resetError } = await supabase
      .from('terms')
      .update({ is_current: false })
      .eq('school_id', schoolId);

    if (resetError) {
      return { data: null, error: resetError };
    }

    return supabase
      .from('terms')
      .update({ is_current: true })
      .eq('id', id)
      .select()
      .single();
  },

  getCurrentTerm: (schoolId) =>
    supabase
      .from('terms')
      .select('*, academic_years(*)')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single(),
};
