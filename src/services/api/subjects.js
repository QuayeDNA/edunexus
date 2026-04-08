import { supabase } from '../supabaseClient';

const SUBJECT_SELECT = 'id, school_id, name, code, category, level_group, is_active';

export const subjectsApi = {
  list: ({ schoolId, search, category, levelGroup, activeOnly } = {}) => {
    let q = supabase
      .from('subjects')
      .select(SUBJECT_SELECT, { count: 'exact' })
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (category) q = q.eq('category', category);
    if (levelGroup) q = q.eq('level_group', levelGroup);
    if (typeof activeOnly === 'boolean') q = q.eq('is_active', activeOnly);
    if (search) q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%`);

    return q;
  },

  create: (data) =>
    supabase.from('subjects').insert(data).select(SUBJECT_SELECT).single(),

  update: (id, data) =>
    supabase.from('subjects').update(data).eq('id', id).select(SUBJECT_SELECT).single(),

  delete: (id) =>
    supabase.from('subjects').delete().eq('id', id),

  listAssignments: async (schoolId) => {
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', schoolId);

    if (classesError) throw classesError;

    const classIds = (classes ?? []).map((c) => c.id);
    if (classIds.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    return supabase
      .from('class_subjects')
      .select(
        `
          id,
          class_id,
          subject_id,
          teacher_id,
          periods_per_week,
          classes(id, name, grade_levels(name)),
          subjects(id, name, code, category, level_group),
          staff(id, first_name, last_name, role)
        `,
        { count: 'exact' }
      )
      .in('class_id', classIds)
      .order('id', { ascending: false });
  },

  createAssignment: (data) =>
    supabase
      .from('class_subjects')
      .insert(data)
      .select(
        `
          id,
          class_id,
          subject_id,
          teacher_id,
          periods_per_week,
          classes(id, name, grade_levels(name)),
          subjects(id, name, code, category, level_group),
          staff(id, first_name, last_name, role)
        `
      )
      .single(),

  updateAssignment: (id, data) =>
    supabase
      .from('class_subjects')
      .update(data)
      .eq('id', id)
      .select(
        `
          id,
          class_id,
          subject_id,
          teacher_id,
          periods_per_week,
          classes(id, name, grade_levels(name)),
          subjects(id, name, code, category, level_group),
          staff(id, first_name, last_name, role)
        `
      )
      .single(),

  deleteAssignment: (id) =>
    supabase.from('class_subjects').delete().eq('id', id),
};
