import { supabase } from '../supabaseClient';

export const studentsApi = {
  list: ({ schoolId, classId, status, search, page = 0, limit = 50 } = {}) => {
    let q = supabase
      .from('students')
      .select(
        '*, classes(name, grade_levels(name)), student_guardians(guardians(first_name, last_name, phone))',
        { count: 'exact' }
      )
      .eq('school_id', schoolId)
      .range(page * limit, (page + 1) * limit - 1)
      .order('last_name', { ascending: true });

    if (classId) q = q.eq('current_class_id', classId);
    if (status)  q = q.eq('status', status);
    if (search) {
      q = q.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_id_number.ilike.%${search}%`
      );
    }
    return q;
  },

  getById: (id) =>
    supabase
      .from('students')
      .select('*, classes(*, grade_levels(*)), student_guardians(guardians(*))')
      .eq('id', id)
      .single(),

  create: (data) =>
    supabase.from('students').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('students').update(data).eq('id', id).select().single(),

  delete: (id) =>
    supabase.from('students').delete().eq('id', id),

  uploadPhoto: async (studentId, file) => {
    const ext = file.name.split('.').pop();
    const path = `students/${studentId}/photo.${ext}`;
    const { error } = await supabase.storage
      .from('student-photos')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('student-photos').getPublicUrl(path);
    return data.publicUrl;
  },

  getAttendanceSummary: (studentId, termId) =>
    supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .eq('term_id', termId),

  getReportCards: (studentId) =>
    supabase
      .from('report_cards')
      .select('*, terms(label), academic_years(label), classes:classes!report_cards_class_id_fkey(name), next_class:classes!report_cards_next_class_id_fkey(name)')
      .eq('student_id', studentId)
      .order('generated_at', { ascending: false }),
};
