export interface AttendanceRecord {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  term_id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  check_in_time?: string | null;
  check_out_time?: string | null;
  remarks?: string | null;
  marked_by: string;
  created_at: string;
  updated_at: string;
}

export interface StaffAttendance {
  id: string;
  school_id: string;
  staff_id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  check_in_time?: string | null;
  check_out_time?: string | null;
  remarks?: string | null;
  marked_by: string;
  created_at: string;
  updated_at: string;
}
