import type { Gender, EmploymentStatus } from './common';

export interface Staff {
  id: string;
  school_id: string;
  staff_id_number: string;
  first_name: string;
  last_name: string;
  other_names?: string | null;
  gender: Gender;
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  role: 'teacher' | 'admin' | 'support' | 'accountant' | 'librarian' | 'transport' | 'nurse';
  employment_status: EmploymentStatus;
  qualification?: string | null;
  specialization?: string | null;
  date_hired: string;
  profile_image_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}