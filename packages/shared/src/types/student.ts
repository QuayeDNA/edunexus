import type { Gender, Status } from './common';

export interface Student {
  id: string;
  school_id: string;
  student_id_number: string;
  first_name: string;
  last_name: string;
  other_names?: string | null;
  gender: Gender;
  date_of_birth: string;
  place_of_birth?: string | null;
  nationality: string;
  home_address: string;
  religion?: string | null;
  medical_notes?: string | null;
  enrollment_date: string;
  status: Status;
  profile_image_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Guardian {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  occupation?: string | null;
  is_primary: boolean;
  is_emergency_contact: boolean;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentGuardian {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
}