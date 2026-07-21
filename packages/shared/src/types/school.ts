import type {
  CurriculumMode,
  CalendarMode,
  GradingSystem,
  Status,
} from "./common";

export interface School {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logo_url?: string | null;
  address: string;
  phone: string;
  email: string;
  curriculum_mode: CurriculumMode;
  calendar_mode: CalendarMode;
  grading_system: GradingSystem;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Term {
  id: string;
  schoolId: string;
  academicYearId: string;
  termNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolConfig {
  id: string;
  school_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}
