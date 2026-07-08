export interface FeeCategory {
  id: string;
  school_id: string;
  name: string;
  description?: string | null;
  is_compulsory: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeSchedule {
  id: string;
  school_id: string;
  academic_year_id: string;
  fee_category_id: string;
  grade_level_id?: string | null;
  amount: number;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface StudentFee {
  id: string;
  student_id: string;
  fee_schedule_id: string;
  amount_paid?: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overpaid' | 'waived';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  term_id?: string | null;
  amount: number;
  payment_method: 'cash' | 'mobile_money' | 'bank_transfer' | 'cheque' | 'card' | 'other';
  momo_provider?: string | null;
  transaction_reference?: string | null;
  payment_date: string;
  receipt_number?: string | null;
  notes?: string | null;
  received_by: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  school_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}