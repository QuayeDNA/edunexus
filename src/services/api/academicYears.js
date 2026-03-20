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

  setCurrent: async (id, schoolId) => {
    // Unset all, then set this one
    await supabase
      .from('academic_years')
      .update({ is_current: false })
      .eq('school_id', schoolId);
    return supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', id)
      .select()
      .single();
  },

  createTerms: (terms) =>
    supabase.from('terms').insert(terms).select(),

  getCurrentTerm: (schoolId) =>
    supabase
      .from('terms')
      .select('*, academic_years(*)')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single(),
};
