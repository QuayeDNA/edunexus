import { supabase } from '../supabaseClient';

const SLOT_SELECT = `
  id,
  class_id,
  class_subject_id,
  day_of_week,
  period_number,
  start_time,
  end_time,
  room,
  classes(id, name, grade_levels(name)),
  class_subjects(
    id,
    class_id,
    subject_id,
    teacher_id,
    periods_per_week,
    subjects(id, name, code, category, level_group, is_active),
    staff(id, first_name, last_name, role)
  )
`;

const ASSIGNMENT_SELECT = `
  id,
  class_id,
  subject_id,
  teacher_id,
  periods_per_week,
  classes(id, name, grade_levels(name)),
  subjects(id, name, code, category, level_group, is_active),
  staff(id, first_name, last_name, role)
`;

const getSchoolClassIds = async (schoolId) => {
  const { data, error } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', schoolId);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
};

export const timetableApi = {
  listSlots: async ({ schoolId, classId } = {}) => {
    if (!schoolId) return { data: [], error: null, count: 0 };

    let classIds = [];
    if (classId) {
      classIds = [classId];
    } else {
      classIds = await getSchoolClassIds(schoolId);
    }

    if (classIds.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    return supabase
      .from('timetable_slots')
      .select(SLOT_SELECT, { count: 'exact' })
      .in('class_id', classIds)
      .order('day_of_week', { ascending: true })
      .order('period_number', { ascending: true });
  },

  createSlot: (data) =>
    supabase.from('timetable_slots').insert(data).select(SLOT_SELECT).single(),

  updateSlot: (id, data) =>
    supabase
      .from('timetable_slots')
      .update(data)
      .eq('id', id)
      .select(SLOT_SELECT)
      .single(),

  deleteSlot: (id) =>
    supabase.from('timetable_slots').delete().eq('id', id),

  listAssignments: async ({ schoolId, classId } = {}) => {
    if (!schoolId) return { data: [], error: null, count: 0 };

    let classIds = [];
    if (classId) {
      classIds = [classId];
    } else {
      classIds = await getSchoolClassIds(schoolId);
    }

    if (classIds.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    return supabase
      .from('class_subjects')
      .select(ASSIGNMENT_SELECT, { count: 'exact' })
      .in('class_id', classIds)
      .order('id', { ascending: false });
  },
};
