export const GHANA_BASIC_GRADES = [
  { min: 80, max: 100, grade: 1, label: "Excellent", remark: "Excellent" },
  { min: 70, max: 79, grade: 2, label: "Very Good", remark: "Very Good" },
  { min: 60, max: 69, grade: 3, label: "Good", remark: "Good" },
  { min: 50, max: 59, grade: 4, label: "Pass", remark: "Pass" },
  { min: 40, max: 49, grade: 5, label: "Weak Pass", remark: "Weak Pass" },
  { min: 0, max: 39, grade: 6, label: "Fail", remark: "Fail" },
] as const;

export const GHANA_BASIC_WEIGHTS = {
  class_exercise: 10,
  homework: 10,
  project: 20,
  mid_term: 20,
  end_of_term_exam: 40,
} as const;

export const GHANA_WASSCE_GRADES = [
  { min: 80, max: 100, grade: "A1", label: "Excellent", points: 1 },
  { min: 70, max: 79, grade: "B2", label: "Very Good", points: 2 },
  { min: 65, max: 69, grade: "B3", label: "Good", points: 3 },
  { min: 60, max: 64, grade: "C4", label: "Credit", points: 4 },
  { min: 55, max: 59, grade: "C5", label: "Credit", points: 5 },
  { min: 50, max: 54, grade: "C6", label: "Credit", points: 6 },
  { min: 45, max: 49, grade: "D7", label: "Pass", points: 7 },
  { min: 40, max: 44, grade: "E8", label: "Pass", points: 8 },
  { min: 0, max: 39, grade: "F9", label: "Fail", points: 9 },
] as const;

export const BRITISH_GCSE_GRADES = [
  { min: 90, max: 100, grade: "A*", label: "Distinction", points: 8 },
  { min: 80, max: 89, grade: "A", label: "Excellent", points: 7 },
  { min: 70, max: 79, grade: "B", label: "Very Good", points: 6 },
  { min: 60, max: 69, grade: "C", label: "Good", points: 5 },
  { min: 50, max: 59, grade: "D", label: "Pass", points: 4 },
  { min: 40, max: 49, grade: "E", label: "Marginal Pass", points: 3 },
  { min: 30, max: 39, grade: "F", label: "Fail", points: 2 },
  { min: 0, max: 29, grade: "G", label: "Fail", points: 1 },
] as const;

export const AMERICAN_GPA_GRADES = [
  { min: 93, max: 100, grade: "A", label: "Excellent", points: 4.0 },
  { min: 90, max: 92, grade: "A-", label: "Very Good", points: 3.7 },
  { min: 87, max: 89, grade: "B+", label: "Good", points: 3.3 },
  { min: 83, max: 86, grade: "B", label: "Good", points: 3.0 },
  { min: 80, max: 82, grade: "B-", label: "Adequate", points: 2.7 },
  { min: 77, max: 79, grade: "C+", label: "Satisfactory", points: 2.3 },
  { min: 73, max: 76, grade: "C", label: "Satisfactory", points: 2.0 },
  { min: 70, max: 72, grade: "C-", label: "Minimum Pass", points: 1.7 },
  { min: 67, max: 69, grade: "D+", label: "Poor", points: 1.3 },
  { min: 63, max: 66, grade: "D", label: "Poor", points: 1.0 },
  { min: 60, max: 62, grade: "D-", label: "Very Poor", points: 0.7 },
  { min: 0, max: 59, grade: "F", label: "Fail", points: 0.0 },
] as const;

export type GradeEntry = {
  min: number;
  max: number;
  grade: string | number;
  label: string;
  points?: number;
  remark?: string;
};

export const GRADE_SYSTEMS = {
  ghana_basic: GHANA_BASIC_GRADES,
  ghana_wasce: GHANA_WASSCE_GRADES,
  british_gcse: BRITISH_GCSE_GRADES,
  american_gpa: AMERICAN_GPA_GRADES,
} as const;
