import { supabase } from '../supabaseClient';

const ATTENDANCE_SELECT_BASE = `
  id,
  student_id,
  class_id,
  date,
  status,
  marked_by,
  remarks,
  created_at,
  students(id, first_name, last_name, student_id_number, status),
  classes(id, name, grade_levels(name)),
  profiles(first_name, last_name, role)
`;

const ATTENDANCE_SELECT_WITH_OVERRIDE = `
  id,
  student_id,
  class_id,
  date,
  status,
  marked_by,
  remarks,
  is_admin_override,
  override_reason,
  overridden_at,
  created_at,
  students(id, first_name, last_name, student_id_number, status),
  classes(id, name, grade_levels(name)),
  profiles(first_name, last_name, role)
`;

const isMissingOverrideColumnsError = (error) => {
  if (!error) return false;

  const debugText = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  return error.code === '42703' || /(is_admin_override|override_reason|overridden_at)/i.test(debugText);
};

const buildByClassDateQuery = (selectClause, classId, date) =>
  supabase
    .from('attendance')
    .select(selectClause, { count: 'exact' })
    .eq('class_id', classId)
    .eq('date', date)
    .order('created_at', { ascending: true });

const buildByDateRangeQuery = (selectClause, { startDate, endDate, classId, status }) => {
  let query = supabase
    .from('attendance')
    .select(selectClause, { count: 'exact' })
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  if (status) {
    query = query.eq('status', normalizeStatus(status));
  }

  return query;
};

const normalizeStatus = (status) => {
  const allowed = new Set(['Present', 'Absent', 'Late', 'Excused']);
  return allowed.has(status) ? status : 'Present';
};

export const attendanceApi = {
  listByClassDate: async ({ classId, date } = {}) => {
    if (!classId || !date) return Promise.resolve({ data: [], error: null, count: 0 });

    const result = await buildByClassDateQuery(ATTENDANCE_SELECT_WITH_OVERRIDE, classId, date);
    if (!isMissingOverrideColumnsError(result.error)) {
      return result;
    }

    return buildByClassDateQuery(ATTENDANCE_SELECT_BASE, classId, date);
  },

  listByDateRange: async ({ startDate, endDate, classId, status } = {}) => {
    if (!startDate || !endDate) {
      return Promise.resolve({ data: [], error: null, count: 0 });
    }

    const result = await buildByDateRangeQuery(ATTENDANCE_SELECT_WITH_OVERRIDE, {
      classId,
      endDate,
      startDate,
      status,
    });

    if (!isMissingOverrideColumnsError(result.error)) {
      return result;
    }

    return buildByDateRangeQuery(ATTENDANCE_SELECT_BASE, {
      classId,
      endDate,
      startDate,
      status,
    });
  },

  getRoster: (classId) => {
    if (!classId) return Promise.resolve({ data: [], error: null });

    return supabase
      .from('students')
      .select('id, first_name, last_name, student_id_number, status, gender, photo_url')
      .eq('current_class_id', classId)
      .eq('status', 'Active')
      .order('last_name', { ascending: true });
  },

  listTeacherClasses: ({ schoolId, teacherProfileId } = {}) => {
    if (!schoolId || !teacherProfileId) return Promise.resolve({ data: [], error: null, count: 0 });

    return supabase
      .from('classes')
      .select('id, name, room, grade_levels(name, level_group, order_index)', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('class_teacher_id', teacherProfileId)
      .order('grade_levels(order_index)', { ascending: true });
  },

  saveBatch: async ({ classId, date, markedBy, rows } = {}) => {
    if (!classId || !date) {
      throw new Error('Class and date are required');
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { data: [], error: null };
    }

    const hasOverrideRows = rows.some((row) => row.is_admin_override === true);

    const buildPayload = ({ includeOverrideFields }) =>
      rows.map((row) => {
        const payload = {
          student_id: row.student_id,
          class_id: classId,
          date,
          status: normalizeStatus(row.status),
          remarks: row.remarks?.trim() ? row.remarks.trim() : null,
          marked_by: markedBy ?? null,
        };

        if (includeOverrideFields) {
          payload.is_admin_override = row.is_admin_override === true;
          payload.override_reason =
            row.is_admin_override === true && row.override_reason?.trim()
              ? row.override_reason.trim()
              : null;
          payload.overridden_at = row.is_admin_override === true ? new Date().toISOString() : null;
        }

        return payload;
      });

    const result = await supabase
      .from('attendance')
      .upsert(buildPayload({ includeOverrideFields: true }), { onConflict: 'student_id,date' })
      .select(ATTENDANCE_SELECT_WITH_OVERRIDE);

    if (!isMissingOverrideColumnsError(result.error)) {
      return result;
    }

    if (hasOverrideRows) {
      throw new Error(
        'Admin override fields are not available in this database yet. Apply migration 009_enable_attendance_rls.sql and reload.'
      );
    }

    return supabase
      .from('attendance')
      .upsert(buildPayload({ includeOverrideFields: false }), { onConflict: 'student_id,date' })
      .select(ATTENDANCE_SELECT_BASE);
  },
};
