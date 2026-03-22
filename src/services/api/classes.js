import { supabase } from '../supabaseClient';

export const classesApi = {
  list: (schoolId, academicYearId) => {
    let q = supabase
      .from('classes')
      .select('*, grade_levels(name, level_group, order_index), profiles!class_teacher_id(first_name, last_name), academic_years(label)', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('grade_levels(order_index)', { ascending: true });
    if (academicYearId) q = q.eq('academic_year_id', academicYearId);
    return q;
  },

  getById: (id) =>
    supabase
      .from('classes')
      .select('*, grade_levels(*), profiles!class_teacher_id(first_name, last_name, avatar_url), academic_years(*)')
      .eq('id', id)
      .single(),

  create: (data) =>
    supabase.from('classes').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('classes').update(data).eq('id', id).select().single(),

  delete: (id) =>
    supabase.from('classes').delete().eq('id', id),

  getRoster: (classId) =>
    supabase
      .from('students')
      .select('id, first_name, last_name, student_id_number, gender, photo_url, status')
      .eq('current_class_id', classId)
      .eq('status', 'Active')
      .order('last_name'),

  getStats: async (classId) => {
    const [{ count: studentCount }, { count: presentToday }] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('current_class_id', classId).eq('status', 'Active'),
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('class_id', classId).eq('date', new Date().toISOString().split('T')[0]).eq('status', 'Present'),
    ]);
    return { studentCount, presentToday };
  },
};
