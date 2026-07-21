export interface GradeLevel {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  level: number;
  category:
    | "creche"
    | "nursery"
    | "kindergarten"
    | "primary"
    | "junior_secondary"
    | "senior_secondary";
  description?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  schoolId: string;
  name: string;
  code?: string | null;
  gradeLevelId: string;
  academicYearId: string;
  homeroomTeacherId?: string | null;
  capacity?: number | null;
  roomNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  category?: string | null;
  is_core: boolean;
  max_score: number;
  pass_score: number;
  created_at: string;
  updated_at: string;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id?: string | null;
  academic_year_id: string;
}

export interface TimetableSlot {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  academic_year_id: string;
  term_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentType {
  id: string;
  school_id: string;
  name: string;
  code: string;
  weight: number;
  category: "continuous" | "exam";
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  school_id: string;
  assessment_type_id: string;
  class_subject_id: string;
  academic_year_id: string;
  term_id: string;
  title: string;
  maximum_score: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number;
  graded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportCard {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  term_id: string;
  class_id: string;
  total_score: number;
  average_score: number;
  position_in_class: number;
  total_marks_obtainable: number;
  remarks?: string | null;
  published: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}
