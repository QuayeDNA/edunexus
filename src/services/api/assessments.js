import { supabase } from '../supabaseClient';

const ASSESSMENT_TYPE_SELECT = 'id, school_id, name, weight_percentage, grading_system';

const ASSESSMENT_SELECT = `
  id,
  class_subject_id,
  assessment_type_id,
  term_id,
  title,
  total_marks,
  date,
  created_by,
  assessment_types(id, name, weight_percentage, grading_system),
  terms(id, label, term_number, start_date, end_date),
  class_subjects(
    id,
    class_id,
    subject_id,
    teacher_id,
    periods_per_week,
    classes(id, name, grade_levels(name)),
    subjects(id, name, code, category, level_group),
    staff(id, first_name, last_name, role)
  )
`;

const SCORE_SELECT = 'id, assessment_id, student_id, score, remarks, is_absent, created_at';

const resolveClassIds = async (schoolId, classId) => {
  if (classId) return [classId];

  const { data, error } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', schoolId);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
};

const resolveClassSubjectIds = async (classIds) => {
  if (!classIds || classIds.length === 0) return [];

  const { data, error } = await supabase
    .from('class_subjects')
    .select('id')
    .in('class_id', classIds);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
};

const saveScoreInternal = async ({ assessment_id, student_id, score, remarks, is_absent }) => {
  const normalizedScore =
    score === '' || score === null || typeof score === 'undefined' ? null : Number(score);

  const { data: existingRows, error: existingError } = await supabase
    .from('assessment_scores')
    .select('id')
    .eq('assessment_id', assessment_id)
    .eq('student_id', student_id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) throw existingError;

  const payload = {
    assessment_id,
    student_id,
    score: is_absent ? null : normalizedScore,
    remarks: remarks || null,
    is_absent: !!is_absent,
  };

  if (existingRows && existingRows.length > 0) {
    const { data, error } = await supabase
      .from('assessment_scores')
      .update(payload)
      .eq('id', existingRows[0].id)
      .select(SCORE_SELECT)
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('assessment_scores')
    .insert(payload)
    .select(SCORE_SELECT)
    .single();

  if (error) throw error;
  return data;
};

export const assessmentsApi = {
  listAssessmentTypes: ({ schoolId, search } = {}) => {
    let q = supabase
      .from('assessment_types')
      .select(ASSESSMENT_TYPE_SELECT, { count: 'exact' })
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (search) {
      q = q.or(`name.ilike.%${search}%,grading_system.ilike.%${search}%`);
    }

    return q;
  },

  createAssessmentType: (data) =>
    supabase.from('assessment_types').insert(data).select(ASSESSMENT_TYPE_SELECT).single(),

  updateAssessmentType: (id, data) =>
    supabase
      .from('assessment_types')
      .update(data)
      .eq('id', id)
      .select(ASSESSMENT_TYPE_SELECT)
      .single(),

  deleteAssessmentType: (id) =>
    supabase.from('assessment_types').delete().eq('id', id),

  listAssessments: async ({ schoolId, classId, termId } = {}) => {
    if (!schoolId) return { data: [], error: null, count: 0 };

    const classIds = await resolveClassIds(schoolId, classId);
    if (classIds.length === 0) return { data: [], error: null, count: 0 };

    const classSubjectIds = await resolveClassSubjectIds(classIds);
    if (classSubjectIds.length === 0) return { data: [], error: null, count: 0 };

    let q = supabase
      .from('assessments')
      .select(ASSESSMENT_SELECT, { count: 'exact' })
      .in('class_subject_id', classSubjectIds)
      .order('date', { ascending: false })
      .order('title', { ascending: true });

    if (termId) q = q.eq('term_id', termId);

    return q;
  },

  createAssessment: (data) =>
    supabase.from('assessments').insert(data).select(ASSESSMENT_SELECT).single(),

  deleteAssessment: (id) =>
    supabase.from('assessments').delete().eq('id', id),

  listAssessmentScores: (assessmentId) =>
    supabase
      .from('assessment_scores')
      .select(SCORE_SELECT)
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false }),

  saveAssessmentScore: (row) => saveScoreInternal(row),

  saveAssessmentScoresBatch: async (rows = []) => {
    const results = [];
    for (const row of rows) {
      const saved = await saveScoreInternal(row);
      results.push(saved);
    }
    return results;
  },

  getClassRoster: (classId) =>
    supabase
      .from('students')
      .select('id, first_name, last_name, student_id_number, status')
      .eq('current_class_id', classId)
      .eq('status', 'Active')
      .order('last_name', { ascending: true }),
};
