export interface GradeLevel {
  id: string
  name: string
  code: string | null
}

export interface ClassRow {
  id: string
  name: string
  code: string | null
}

export interface SubjectCol {
  id: string
  name: string
  code: string
  isCore: boolean
}

export interface Assignment {
  classId: string
  subjectId: string
  teacherId: string | null
}

export interface StaffOption {
  id: string
  firstName: string
  lastName: string
}

export interface ConflictAssignment {
  classId: string
  className: string
  subjectId: string
  subjectName: string
}

export interface Conflict {
  teacherId: string
  teacherName: string
  gradeLevelId: string
  gradeLevelName: string
  assignments: ConflictAssignment[]
}

export interface SaveResult {
  saved: number
  errors: { classId: string; subjectId: string; error: string }[]
  conflicts: Conflict[]
}

export interface MatrixClientProps {
  gradeLevels: GradeLevel[]
  defaultAcademicYearId: string
}
