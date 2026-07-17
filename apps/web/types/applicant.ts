export interface ApplicantStats {
  total: number;
  submitted: number;
  under_review: number;
  accepted: number;
  rejected: number;
  waitlisted: number;
}

export interface ApplicantListItem {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  guardianEmail: string;
  status: string;
  gradeLevelId: string;
  createdAt: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface ApplicantDetail {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  gradeLevelName: string | null;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string | null;
  guardianAddress: string | null;
  guardianOccupation: string | null;
  guardianEmployer: string | null;
  previousSchool: string | null;
  medicalAllergies: string | null;
  medicalConditions: string | null;
  medicalMedications: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  emergencyContacts: EmergencyContact[] | null;
  siblingsEnrolled: boolean | null;
  siblingDetails: string | null;
  status: string;
  createdAt: string;
}

export interface ApplicantAuditEntry {
  id: string;
  action: string;
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
  createdAt: string;
}

export interface ApplicantClassOption {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
}

export interface ConversionResult {
  applicant: { id: string; status: string; targetClassId: string };
  student: { id: string; studentIdNumber: string; firstName: string; lastName: string };
  enrollment: { id: string; classId: string; academicYearId: string };
  guardian: { id: string; name: string; email: string };
  credentials: {
    student: { email: string | null; password: string };
    parent: { email: string | null; password: string };
  };
}
