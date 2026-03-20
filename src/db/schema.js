import Dexie from 'dexie';

const db = new Dexie('EduNexus_v2');

db.version(1).stores({
  // Core entities
  students:          '++localId, id, school_id, status, current_class_id, syncStatus',
  staff:             '++localId, id, school_id, role, syncStatus',
  classes:           '++localId, id, school_id, grade_level_id, academic_year_id, syncStatus',
  grade_levels:      '++localId, id, school_id, order_index, syncStatus',
  subjects:          '++localId, id, school_id, syncStatus',

  // Attendance
  attendance:        '++localId, id, student_id, class_id, date, syncStatus',
  staff_attendance:  '++localId, id, staff_id, date, syncStatus',

  // Academic
  assessments:       '++localId, id, class_subject_id, term_id, syncStatus',
  assessment_scores: '++localId, id, assessment_id, student_id, syncStatus',
  report_cards:      '++localId, id, student_id, term_id, syncStatus',

  // Finance
  payments:          '++localId, id, student_id, syncStatus',
  student_fees:      '++localId, id, student_id, syncStatus',
  fee_schedules:     '++localId, id, school_id, term_id, syncStatus',

  // Communication
  announcements:     '++localId, id, school_id, syncStatus',
  notifications:     '++localId, id, user_id, is_read',

  // Offline sync queue
  syncQueue:         '++id, table, operation, createdAt, attempts, status',

  // Query cache
  cachedQueries:     'queryKey, data, cachedAt',
});

export default db;
