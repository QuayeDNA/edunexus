import type { EmploymentStatus } from './common';

export interface Staff {
  id: string;
  schoolId: string;
  staffIdNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  gender: 'male' | 'female';
  dateOfBirth: string;
  nationality?: string | null;
  religion?: string | null;
  address?: string | null;
  phone: string;
  email?: string | null;
  role: 'teacher' | 'admin' | 'support' | 'accountant' | 'librarian' | 'transport' | 'nurse';
  department?: string | null;
  employmentStatus: EmploymentStatus;
  dateHired: string;
  qualification?: string | null;
  ssnitNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  emergencyContact?: string | null;
  emergencyName?: string | null;
  profileId?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface EmploymentContract {
  id: string;
  schoolId: string;
  staffId: string;
  type: 'permanent' | 'fixed_term' | 'part_time';
  startDate: string;
  endDate?: string | null;
  salary?: string | null;
  position?: string | null;
  createdAt: string;
}
