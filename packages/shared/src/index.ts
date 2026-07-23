export {
     hexToOklch,
     contrastRatio,
     oklchToCss,
     resolveTenantAccent,
     GROUND_LIGHT,
     GROUND_DARK,
   } from "./utils/tenant-theme";
export type { OklchColor, TenantAccentResult } from "./utils/tenant-theme";
   
// Types
export type {
  UserRole,
  Gender,
  Status,
  EmploymentStatus,
  CurriculumMode,
  CalendarMode,
  GradingSystem,
  PaginationParams,
} from "./types/common";

export type { School, AcademicYear, Term, SchoolConfig } from "./types/school";

export type { Student, Guardian, StudentGuardian } from "./types/student";

export type { Staff } from "./types/staff";

export type {
  GradeLevel,
  Class,
  Subject,
  ClassSubject,
  TimetableSlot,
  AssessmentType,
  Assessment,
  AssessmentScore,
  ReportCard,
} from "./types/academics";

export type { AttendanceRecord, StaffAttendance } from "./types/attendance";

export type {
  FeeCategory,
  FeeSchedule,
  StudentFee,
  Payment,
  Expense,
} from "./types/finance";

// Constants
export {
  ROLES,
  ROLE_ROUTES,
  ROLE_LABELS,
  ROLE_HIERARCHY,
} from "./constants/roles";

export {
  GHANA_BASIC_GRADES,
  GHANA_BASIC_WEIGHTS,
  GHANA_WASSCE_GRADES,
  BRITISH_GCSE_GRADES,
  AMERICAN_GPA_GRADES,
  GRADE_SYSTEMS,
} from "./constants/grades";

export {
  GHANA_TERMS,
  GHANA_GRADE_LEVELS,
  MOMO_PROVIDERS,
  detectMomoProvider,
  GHANA_REGIONS,
  CURRENCY,
} from "./constants/ghana";

// Utils
export {
  SSNIT_RATES,
  GHANA_PAYE_BANDS,
  calculateGhanaPAYE,
  calculatePayslip,
} from "./utils/ghana-payroll";

export type {
  GHANA_PAYE_BAND,
  PayslipInput,
  PayslipResult,
} from "./utils/ghana-payroll";

export {
  getGrade,
  calculateWeightedAverage,
  calculatePositionInClass,
  calculateClassAverage,
  hasPassed,
} from "./utils/grade-utils";

export type { ScoreEntry } from "./utils/grade-utils";

export {
  formatGHS,
  formatDate,
  formatPhone,
  formatName,
  truncate,
  pluralize,
} from "./utils/formatters";

export type {
  EntityType,
  MediaFile,
  UploadResult,
  StorageProvider,
  FilePermission,
} from "./types/storage";

export {
  buildStoragePath,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  STORAGE_PERMISSIONS,
  checkFilePermission,
} from "./constants/storage";
