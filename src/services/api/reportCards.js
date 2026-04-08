import { supabase } from '../supabaseClient';

const REPORT_CARD_SELECT = `
  id,
  student_id,
  class_id,
  term_id,
  academic_year_id,
  total_score,
  average_score,
  position_in_class,
  position_out_of,
  conduct,
  attitude,
  interest,
  days_present,
  days_absent,
  days_late,
  class_teacher_remark,
  head_teacher_remark,
  is_promoted,
  next_class_id,
  generated_at,
  pdf_url,
  students(id, first_name, last_name, student_id_number, status),
  classes:classes!report_cards_class_id_fkey(id, name, grade_levels(name)),
  next_class:classes!report_cards_next_class_id_fkey(id, name, grade_levels(name)),
  terms(id, label, term_number),
  academic_years(id, label)
`;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const round2 = (value) => Math.round(value * 100) / 100;

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const resolveClassIds = async (schoolId, classId) => {
  if (classId) return [classId];

  const { data, error } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', schoolId);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
};

const buildCalculatedRows = ({ students, assessments }) => {
  const validAssessments = assessments.filter((assessment) => toNumber(assessment.total_marks) > 0);

  if (validAssessments.length === 0) {
    throw new Error('All assessments for this class/term have invalid total marks');
  }

  const assessmentIds = validAssessments.map((assessment) => assessment.id);

  return {
    validAssessments,
    assessmentIds,
    assessmentCount: validAssessments.length,
    studentIds: students.map((student) => student.id),
  };
};

const rankRows = (rows) => {
  const sorted = [...rows].sort((a, b) => {
    if (b.average_score !== a.average_score) return b.average_score - a.average_score;
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    const aName = `${a._student_last_name} ${a._student_first_name}`.trim();
    const bName = `${b._student_last_name} ${b._student_first_name}`.trim();
    return aName.localeCompare(bName);
  });

  let currentPosition = 0;
  let lastAverage = null;

  for (let i = 0; i < sorted.length; i += 1) {
    const row = sorted[i];
    if (lastAverage === null || Math.abs(row.average_score - lastAverage) > 0.0001) {
      currentPosition = i + 1;
      lastAverage = row.average_score;
    }

    row.position_in_class = currentPosition;
    row.position_out_of = sorted.length;
  }

  return sorted;
};

export const reportCardsApi = {
  list: async ({ schoolId, classId, termId } = {}) => {
    if (!schoolId) return { data: [], error: null, count: 0 };

    const classIds = await resolveClassIds(schoolId, classId);
    if (classIds.length === 0) return { data: [], error: null, count: 0 };

    let q = supabase
      .from('report_cards')
      .select(REPORT_CARD_SELECT, { count: 'exact' })
      .in('class_id', classIds)
      .order('generated_at', { ascending: false, nullsFirst: false })
      .order('average_score', { ascending: false, nullsFirst: false });

    if (termId) q = q.eq('term_id', termId);

    return q;
  },

  getById: (id) =>
    supabase
      .from('report_cards')
      .select(REPORT_CARD_SELECT)
      .eq('id', id)
      .single(),

  update: (id, data) =>
    supabase
      .from('report_cards')
      .update(data)
      .eq('id', id)
      .select(REPORT_CARD_SELECT)
      .single(),

  delete: (id) => supabase.from('report_cards').delete().eq('id', id),

  generateForClassTerm: async ({ classId, termId }) => {
    if (!classId || !termId) {
      throw new Error('Class and term are required');
    }

    const [
      { data: term, error: termError },
      { data: students, error: studentError },
      { data: classSubjects, error: classSubjectError },
    ] = await Promise.all([
      supabase
        .from('terms')
        .select('id, academic_year_id, label')
        .eq('id', termId)
        .single(),
      supabase
        .from('students')
        .select('id, first_name, last_name, student_id_number, status')
        .eq('current_class_id', classId)
        .eq('status', 'Active')
        .order('last_name', { ascending: true }),
      supabase
        .from('class_subjects')
        .select('id')
        .eq('class_id', classId),
    ]);

    if (termError) throw termError;
    if (studentError) throw studentError;
    if (classSubjectError) throw classSubjectError;

    if (!students || students.length === 0) {
      return { data: [], generatedCount: 0, updatedCount: 0 };
    }

    const classSubjectIds = (classSubjects ?? []).map((row) => row.id);
    if (classSubjectIds.length === 0) {
      throw new Error('No class-subject assignments found for this class');
    }

    const { data: assessments, error: assessmentError } = await supabase
      .from('assessments')
      .select('id, total_marks, class_subject_id')
      .eq('term_id', termId)
      .in('class_subject_id', classSubjectIds);

    if (assessmentError) throw assessmentError;

    if (!assessments || assessments.length === 0) {
      throw new Error('No assessments found for this class and term');
    }

    const calcContext = buildCalculatedRows({ students, assessments });

    const { data: scoreRows, error: scoreError } = await supabase
      .from('assessment_scores')
      .select('assessment_id, student_id, score, is_absent')
      .in('assessment_id', calcContext.assessmentIds)
      .in('student_id', calcContext.studentIds);

    if (scoreError) throw scoreError;

    const scoreMap = new Map();
    (scoreRows ?? []).forEach((row) => {
      const key = `${row.student_id}:${row.assessment_id}`;
      scoreMap.set(key, row);
    });

    const computedRows = students.map((student) => {
      let totalPercent = 0;

      calcContext.validAssessments.forEach((assessment) => {
        const totalMarks = toNumber(assessment.total_marks);
        if (totalMarks <= 0) return;

        const scoreKey = `${student.id}:${assessment.id}`;
        const scoreRow = scoreMap.get(scoreKey);

        const rawScore = scoreRow?.is_absent ? null : scoreRow?.score;
        const numericScore = rawScore == null ? null : toNumber(rawScore);

        const percent =
          numericScore == null
            ? 0
            : clampPercent((numericScore / totalMarks) * 100);

        totalPercent += percent;
      });

      const averageScore = totalPercent / calcContext.assessmentCount;

      return {
        student_id: student.id,
        class_id: classId,
        term_id: termId,
        academic_year_id: term.academic_year_id,
        total_score: round2(totalPercent),
        average_score: round2(averageScore),
        is_promoted: averageScore >= 50,
        generated_at: new Date().toISOString(),
        _student_first_name: student.first_name ?? '',
        _student_last_name: student.last_name ?? '',
      };
    });

    const rankedRows = rankRows(computedRows).map((row) => ({
      student_id: row.student_id,
      class_id: row.class_id,
      term_id: row.term_id,
      academic_year_id: row.academic_year_id,
      total_score: row.total_score,
      average_score: row.average_score,
      position_in_class: row.position_in_class,
      position_out_of: row.position_out_of,
      is_promoted: row.is_promoted,
      generated_at: row.generated_at,
    }));

    const { data: existingRows, error: existingError } = await supabase
      .from('report_cards')
      .select('id, student_id')
      .eq('class_id', classId)
      .eq('term_id', termId)
      .in('student_id', calcContext.studentIds);

    if (existingError) throw existingError;

    const existingByStudent = new Map((existingRows ?? []).map((row) => [row.student_id, row.id]));

    const inserts = [];
    const updates = [];

    rankedRows.forEach((row) => {
      const existingId = existingByStudent.get(row.student_id);
      if (existingId) {
        updates.push({ id: existingId, data: row });
      } else {
        inserts.push(row);
      }
    });

    for (const updateRow of updates) {
      const { error } = await supabase
        .from('report_cards')
        .update(updateRow.data)
        .eq('id', updateRow.id);
      if (error) throw error;
    }

    if (inserts.length > 0) {
      const { error } = await supabase
        .from('report_cards')
        .insert(inserts);
      if (error) throw error;
    }

    const { data: refreshedRows, error: refreshError } = await supabase
      .from('report_cards')
      .select(REPORT_CARD_SELECT)
      .eq('class_id', classId)
      .eq('term_id', termId)
      .order('position_in_class', { ascending: true });

    if (refreshError) throw refreshError;

    return {
      data: refreshedRows ?? [],
      generatedCount: inserts.length,
      updatedCount: updates.length,
    };
  },
};
