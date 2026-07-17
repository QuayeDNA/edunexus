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
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Term {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface SchoolConfig {
  id: string;
  school_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}
