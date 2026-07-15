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
