export type EnrollmentStatus = 'active' | 'withdrawn' | 'transferred_out' | 'graduated';

export interface ClassOption {
  id: string;
  name: string;
  code: string | null;
  gradeLevelId: string;
  capacity?: number | null;
}

export interface GradeOption {
  id: string;
  name: string;
  code: string;
}

export interface AcademicYearOption {
  id: string;
  name: string;
}

export interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  studentIdNumber: string;
  gender: string;
  status: string;
  enrollmentDate: string;
  className: string | null;
  gradeLevelName: string | null;
  guardianName: string | null;
}

export interface StatsData {
  total: number;
  activeCount: number;
  byStatus: Array<{ status: string; count: number }>;
  byClass: Array<{ className: string; count: number }>;
}

export interface StudentDetail {
  id: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  studentIdNumber: string;
  gender: string;
  dateOfBirth: string;
  placeOfBirth: string | null;
  nationality: string | null;
  religion: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
  medicalNotes: string | null;
  enrollmentDate: string;
  status: string;
}

export interface GuardianRow {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  isPrimary: boolean;
}

export interface EnrollmentRow {
  id: string;
  status: string;
  enrollmentDate: string;
  endDate: string | null;
  className: string | null;
  academicYearName: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  tableName: string;
  createdAt: string;
  userId: string | null;
}

export interface StudentProfileData {
  id: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  gender: string;
  dateOfBirth: string;
  placeOfBirth: string | null;
  nationality: string | null;
  religion: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
  medicalNotes: string | null;
}

export interface StudentEditFormValues {
  firstName: string;
  lastName: string;
  otherNames: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  religion: string;
  address: string;
  phone: string;
  email: string;
  bloodGroup: string;
  medicalNotes: string;
}

export interface ValidationRow {
  rowNumber: number;
  valid: boolean;
  firstName?: string;
  errors?: Record<string, string[]>;
}

export interface ValidationData {
  valid: number;
  invalid: number;
  rows: ValidationRow[];
}

export interface ImportData {
  imported: number;
  failed: number;
  results?: { rowNumber: number; status: string; error?: string }[];
}
