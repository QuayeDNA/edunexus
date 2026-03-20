export const APP_NAME = 'EduNexus';
export const APP_VERSION = '1.0.0';
export const APP_TAGLINE = 'One platform. Every learner. Every school.';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

export const CURRICULUM_MODES = {
  GHANA_BASIC: 'ghana_basic',
  GHANA_SHS: 'ghana_shs',
  BRITISH: 'british',
  AMERICAN: 'american',
  IB: 'ib',
};

export const CALENDAR_MODES = {
  TRIMESTER: 'trimester',
  SEMESTER: 'semester',
};

export const GRADING_SYSTEMS = {
  GHANA_BASIC: 'ghana_basic',
  GHANA_WASSCE: 'ghana_wassce',
  BRITISH_GCSE: 'british_gcse',
  AMERICAN_GPA: 'american_gpa',
  IB: 'ib',
};

export const PAYMENT_METHODS = [
  'Cash',
  'MTN MoMo',
  'Vodafone Cash',
  'AirtelTigo Money',
  'Bank Transfer',
  'Paystack',
  'Cheque',
];

export const STUDENT_STATUSES = [
  'Active',
  'Inactive',
  'Graduated',
  'Transferred',
  'Suspended',
];

export const STAFF_STATUSES = ['Active', 'On Leave', 'Terminated', 'Retired'];

export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Volunteer',
];

export const STAFF_ROLES = [
  'Teacher',
  'Head Teacher',
  'Admin',
  'Accountant',
  'Librarian',
  'Counselor',
  'Support Staff',
];

export const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export const GUARDIAN_RELATIONSHIPS = [
  'Father',
  'Mother',
  'Guardian',
  'Sponsor',
  'Uncle',
  'Aunt',
  'Grandparent',
  'Other',
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Brong-Ahafo',
  'Oti',
  'Ahafo',
  'Bono East',
  'North East',
  'Savannah',
  'Western North',
];

export const MOMO_PROVIDERS = [
  {
    code: 'mtn',
    name: 'MTN Mobile Money',
    prefix: ['024', '054', '055', '059'],
    color: '#FFCC00',
  },
  {
    code: 'vodafone',
    name: 'Vodafone Cash',
    prefix: ['020', '050'],
    color: '#E60000',
  },
  {
    code: 'airteltigo',
    name: 'AirtelTigo Money',
    prefix: ['027', '057', '026', '056'],
    color: '#FF6600',
  },
];

// Detect MoMo provider from phone number prefix
export const detectMoMoProvider = (phone) => {
  if (!phone) return null;
  const clean = phone.replace(/\s|-|\(|\)/g, '');
  const prefix = clean.startsWith('0') ? clean.slice(0, 3) : '0' + clean.slice(0, 2);
  return MOMO_PROVIDERS.find((p) => p.prefix.includes(prefix)) ?? null;
};

export const CURRICULUM_DESCRIPTIONS = {
  ghana_basic: {
    label: 'Ghana Basic Education',
    description: 'Crèche through JHS 3 — aligned with GES standards',
    terms: '3 Terms per year',
    grading: 'Grade 1–6 scale',
    flag: '🇬🇭',
  },
  ghana_shs: {
    label: 'Ghana Senior High (WASSCE)',
    description: 'SHS 1–3 — WAEC/WASSCE examination system',
    terms: '3 Terms per year',
    grading: 'A1–F9 scale',
    flag: '🇬🇭',
  },
  british: {
    label: 'British Curriculum',
    description: 'Year 1–13 — GCSE and A-Level examinations',
    terms: 'Autumn, Spring, Summer terms',
    grading: 'Grade 9–1 (GCSE)',
    flag: '🇬🇧',
  },
  american: {
    label: 'American Curriculum',
    description: 'Grades K–12 — SAT/AP examination system',
    terms: '2 Semesters per year',
    grading: 'A–F / GPA 4.0 scale',
    flag: '🇺🇸',
  },
  ib: {
    label: 'International Baccalaureate',
    description: 'PYP, MYP, and DP programmes',
    terms: '2 Semesters per year',
    grading: 'IB 1–7 scale',
    flag: '🌍',
  },
};
