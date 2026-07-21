export type UserRole =
  "super_admin" | "admin" | "teacher" | "student" | "parent";

export type Gender = "male" | "female";

export type Status =
  "active" | "inactive" | "suspended" | "graduated" | "withdrawn";

export type EmploymentStatus =
  "permanent" | "contract" | "probation" | "intern" | "part_time";

export type CurriculumMode =
  "ghana_basic" | "ghana_wasce" | "british_gcse" | "american_gpa";

export type CalendarMode =
  "ghana_3_terms" | "british_3_terms" | "american_semesters";

export type GradingSystem =
  "ghana_basic" | "ghana_wasce" | "british_gcse" | "american_gpa";

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
