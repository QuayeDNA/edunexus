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

export interface MatrixClientProps {
  gradeLevels: GradeLevel[]
  defaultAcademicYearId: string
}
