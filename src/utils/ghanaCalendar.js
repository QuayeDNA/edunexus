export const GHANA_TERMS = {
  term1: { label: 'First Term', months: ['Sep', 'Oct', 'Nov', 'Dec'] },
  term2: { label: 'Second Term', months: ['Jan', 'Feb', 'Mar', 'Apr'] },
  term3: { label: 'Third Term', months: ['Apr', 'May', 'Jun', 'Jul', 'Aug'] },
};

export const GHANA_GRADE_LEVELS = [
  // Crèche / Pre-school
  { name: 'Crèche',    group: 'nursery', order: 1 },
  { name: 'Nursery 1', group: 'nursery', order: 2 },
  { name: 'Nursery 2', group: 'nursery', order: 3 },
  { name: 'KG 1',      group: 'nursery', order: 4 },
  { name: 'KG 2',      group: 'nursery', order: 5 },
  // Lower Primary
  { name: 'Primary 1', group: 'primary', order: 6 },
  { name: 'Primary 2', group: 'primary', order: 7 },
  { name: 'Primary 3', group: 'primary', order: 8 },
  // Upper Primary
  { name: 'Primary 4', group: 'primary', order: 9 },
  { name: 'Primary 5', group: 'primary', order: 10 },
  { name: 'Primary 6', group: 'primary', order: 11 },
  // Junior High School
  { name: 'JHS 1',     group: 'jhs',     order: 12 },
  { name: 'JHS 2',     group: 'jhs',     order: 13 },
  { name: 'JHS 3',     group: 'jhs',     order: 14 },
  // Senior High School
  { name: 'SHS 1',     group: 'shs',     order: 15 },
  { name: 'SHS 2',     group: 'shs',     order: 16 },
  { name: 'SHS 3',     group: 'shs',     order: 17 },
];

export const BRITISH_GRADE_LEVELS = [
  { name: 'Nursery',  group: 'eyfs',      order: 1 },
  { name: 'Reception',group: 'eyfs',      order: 2 },
  { name: 'Year 1',   group: 'ks1',       order: 3 },
  { name: 'Year 2',   group: 'ks1',       order: 4 },
  { name: 'Year 3',   group: 'ks2',       order: 5 },
  { name: 'Year 4',   group: 'ks2',       order: 6 },
  { name: 'Year 5',   group: 'ks2',       order: 7 },
  { name: 'Year 6',   group: 'ks2',       order: 8 },
  { name: 'Year 7',   group: 'ks3',       order: 9 },
  { name: 'Year 8',   group: 'ks3',       order: 10 },
  { name: 'Year 9',   group: 'ks3',       order: 11 },
  { name: 'Year 10',  group: 'gcse',      order: 12 },
  { name: 'Year 11',  group: 'gcse',      order: 13 },
  { name: 'Year 12',  group: 'a_level',   order: 14 },
  { name: 'Year 13',  group: 'a_level',   order: 15 },
];

export const AMERICAN_GRADE_LEVELS = [
  { name: 'Pre-K',    group: 'preschool', order: 1 },
  { name: 'Kindergarten', group: 'elementary', order: 2 },
  { name: 'Grade 1',  group: 'elementary', order: 3 },
  { name: 'Grade 2',  group: 'elementary', order: 4 },
  { name: 'Grade 3',  group: 'elementary', order: 5 },
  { name: 'Grade 4',  group: 'elementary', order: 6 },
  { name: 'Grade 5',  group: 'elementary', order: 7 },
  { name: 'Grade 6',  group: 'middle',     order: 8 },
  { name: 'Grade 7',  group: 'middle',     order: 9 },
  { name: 'Grade 8',  group: 'middle',     order: 10 },
  { name: 'Grade 9',  group: 'high',       order: 11 },
  { name: 'Grade 10', group: 'high',       order: 12 },
  { name: 'Grade 11', group: 'high',       order: 13 },
  { name: 'Grade 12', group: 'high',       order: 14 },
];

export const GRADE_LEVELS_BY_CURRICULUM = {
  ghana_basic: GHANA_GRADE_LEVELS,
  ghana_shs: GHANA_GRADE_LEVELS,
  british: BRITISH_GRADE_LEVELS,
  american: AMERICAN_GRADE_LEVELS,
  ib: GHANA_GRADE_LEVELS, // default, customizable
};

export const GHANA_PUBLIC_HOLIDAYS = [
  { date: '01-01', name: "New Year's Day" },
  { date: '03-06', name: 'Independence Day' },
  { date: '05-01', name: 'Workers Day' },
  { date: '07-01', name: 'Republic Day' },
  { date: '08-04', name: 'Founders Day' },
  { date: '09-21', name: 'Kwame Nkrumah Memorial Day' },
  { date: '12-25', name: 'Christmas Day' },
  { date: '12-26', name: 'Boxing Day' },
  // Plus Eid al-Fitr and Eid al-Adha (variable dates)
];

/**
 * Generate default academic terms for a new academic year
 */
export const generateGhanaTerms = (academicYearId, schoolId, yearStart) => {
  const year = new Date(yearStart).getFullYear();
  return [
    {
      school_id: schoolId,
      academic_year_id: academicYearId,
      label: 'First Term',
      term_number: 1,
      start_date: `${year}-09-02`,
      end_date: `${year}-12-20`,
      is_current: true,
    },
    {
      school_id: schoolId,
      academic_year_id: academicYearId,
      label: 'Second Term',
      term_number: 2,
      start_date: `${year + 1}-01-13`,
      end_date: `${year + 1}-04-11`,
      is_current: false,
    },
    {
      school_id: schoolId,
      academic_year_id: academicYearId,
      label: 'Third Term',
      term_number: 3,
      start_date: `${year + 1}-04-28`,
      end_date: `${year + 1}-08-01`,
      is_current: false,
    },
  ];
};
