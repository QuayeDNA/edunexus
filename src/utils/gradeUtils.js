// ─── Ghana Basic Education ────────────────────────────────────────────────────

export const GHANA_BASIC_GRADES = [
  { min: 80, max: 100, grade: '1', remark: 'Excellent' },
  { min: 70, max: 79, grade: '2', remark: 'Very Good' },
  { min: 60, max: 69, grade: '3', remark: 'Good' },
  { min: 50, max: 59, grade: '4', remark: 'Credit' },
  { min: 40, max: 49, grade: '5', remark: 'Pass' },
  { min: 0, max: 39, grade: '6', remark: 'Fail' },
];

export const GHANA_BASIC_WEIGHTS = {
  classExercise: 20,
  groupExercise: 10,
  project: 10,
  homework: 10,
  endOfTermExam: 50,
};

// ─── Ghana WASSCE / SHS ───────────────────────────────────────────────────────

export const GHANA_WASSCE_GRADES = [
  { min: 80, max: 100, grade: 'A1', points: 1, remark: 'Excellent' },
  { min: 70, max: 79, grade: 'B2', points: 2, remark: 'Very Good' },
  { min: 65, max: 69, grade: 'B3', points: 3, remark: 'Good' },
  { min: 60, max: 64, grade: 'C4', points: 4, remark: 'Credit' },
  { min: 55, max: 59, grade: 'C5', points: 5, remark: 'Credit' },
  { min: 50, max: 54, grade: 'C6', points: 6, remark: 'Credit' },
  { min: 45, max: 49, grade: 'D7', points: 7, remark: 'Pass' },
  { min: 40, max: 44, grade: 'E8', points: 8, remark: 'Pass' },
  { min: 0, max: 39, grade: 'F9', points: 9, remark: 'Fail' },
];

// ─── British GCSE / A-Level ───────────────────────────────────────────────────

export const BRITISH_GCSE_GRADES = [
  { min: 90, max: 100, grade: '9', remark: 'Exceptional' },
  { min: 80, max: 89, grade: '8', remark: 'Outstanding' },
  { min: 70, max: 79, grade: '7', remark: 'Very Good' },
  { min: 60, max: 69, grade: '6', remark: 'Good' },
  { min: 50, max: 59, grade: '5', remark: 'Strong Pass' },
  { min: 40, max: 49, grade: '4', remark: 'Standard Pass' },
  { min: 30, max: 39, grade: '3', remark: 'Below Standard' },
  { min: 20, max: 29, grade: '2', remark: 'Poor' },
  { min: 0, max: 19, grade: '1', remark: 'Very Poor' },
];

// ─── American GPA ─────────────────────────────────────────────────────────────

export const AMERICAN_GPA_GRADES = [
  { min: 93, max: 100, grade: 'A', gpa: 4.0, remark: 'Excellent' },
  { min: 90, max: 92, grade: 'A-', gpa: 3.7, remark: 'Excellent' },
  { min: 87, max: 89, grade: 'B+', gpa: 3.3, remark: 'Good' },
  { min: 83, max: 86, grade: 'B', gpa: 3.0, remark: 'Good' },
  { min: 80, max: 82, grade: 'B-', gpa: 2.7, remark: 'Good' },
  { min: 77, max: 79, grade: 'C+', gpa: 2.3, remark: 'Average' },
  { min: 73, max: 76, grade: 'C', gpa: 2.0, remark: 'Average' },
  { min: 70, max: 72, grade: 'C-', gpa: 1.7, remark: 'Below Average' },
  { min: 0, max: 69, grade: 'F', gpa: 0.0, remark: 'Fail' },
];

// ─── IB ───────────────────────────────────────────────────────────────────────

export const IB_GRADES = [
  { min: 93, max: 100, grade: '7', remark: 'Excellent' },
  { min: 80, max: 92, grade: '6', remark: 'Very Good' },
  { min: 70, max: 79, grade: '5', remark: 'Good' },
  { min: 55, max: 69, grade: '4', remark: 'Satisfactory' },
  { min: 40, max: 54, grade: '3', remark: 'Mediocre' },
  { min: 25, max: 39, grade: '2', remark: 'Poor' },
  { min: 0, max: 24, grade: '1', remark: 'Very Poor' },
];

// ─── Grade Lookup ─────────────────────────────────────────────────────────────

const GRADE_SCALES = {
  ghana_basic: GHANA_BASIC_GRADES,
  ghana_wassce: GHANA_WASSCE_GRADES,
  british_gcse: BRITISH_GCSE_GRADES,
  american_gpa: AMERICAN_GPA_GRADES,
  ib: IB_GRADES,
};

/**
 * Get grade object for a given score and grading system
 * @param {number} score - score as percentage (0-100)
 * @param {string} system - grading system key
 * @returns {{ grade, remark, gpa?, points? }}
 */
export const getGrade = (score, system = 'ghana_basic') => {
  const scale = GRADE_SCALES[system] ?? GRADE_SCALES.ghana_basic;
  return scale.find((g) => score >= g.min && score <= g.max) ?? scale[scale.length - 1];
};

/**
 * Get color class for a grade remark
 */
export const getGradeColor = (remark) => {
  const map = {
    Excellent: 'text-accent-600',
    'Very Good': 'text-accent-500',
    Outstanding: 'text-accent-600',
    Exceptional: 'text-accent-700',
    Good: 'text-brand-600',
    Credit: 'text-brand-500',
    Pass: 'text-status-warning',
    Satisfactory: 'text-status-warning',
    Average: 'text-status-warning',
    'Below Average': 'text-status-danger',
    Fail: 'text-status-danger',
    'Very Poor': 'text-status-danger',
    Poor: 'text-status-danger',
  };
  return map[remark] ?? 'text-text-secondary';
};

/**
 * Calculate weighted score from components
 * @param {Object} scores - { classExercise, groupExercise, project, homework, endOfTermExam }
 * @param {Object} weights - weight percentages (default Ghana basic)
 */
export const calculateWeightedScore = (scores, weights = GHANA_BASIC_WEIGHTS) => {
  let total = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] != null) {
      total += (scores[key] / 100) * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) return 0;
  return (total / totalWeight) * 100;
};
