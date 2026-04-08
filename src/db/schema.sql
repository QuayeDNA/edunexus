-- ============================================================
-- EduNexus Complete Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- ─── SCHOOL CONFIGURATION ────────────────────────────────────────────────────

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  motto text,
  curriculum_mode text default 'ghana_basic',
  calendar_mode text default 'trimester',
  grading_system text default 'ghana_basic',
  currency_code text default 'GHS',
  timezone text default 'Africa/Accra',
  country text default 'GH',
  created_at timestamptz default now()
);

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);

create table if not exists terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  academic_year_id uuid references academic_years(id),
  label text not null,
  term_number int,
  start_date date not null,
  end_date date not null,
  is_current boolean default false
);

-- ─── USERS & PROFILES ─────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id),
  role text not null check (role in ('super_admin','admin','teacher','student','parent')),
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── CLASSES & GRADES ─────────────────────────────────────────────────────────

create table if not exists grade_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  order_index int,
  level_group text,
  curriculum_code text
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  grade_level_id uuid references grade_levels(id),
  name text not null,
  academic_year_id uuid references academic_years(id),
  class_teacher_id uuid references profiles(id),
  room text,
  capacity int,
  created_at timestamptz default now()
);

-- ─── STUDENTS ─────────────────────────────────────────────────────────────────

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  profile_id uuid references profiles(id),
  student_id_number text unique,
  first_name text not null,
  last_name text not null,
  other_names text,
  date_of_birth date,
  gender text check (gender in ('Male','Female','Other')),
  nationality text default 'Ghanaian',
  religion text,
  blood_type text,
  photo_url text,
  address text,
  city text,
  region text,
  admission_date date,
  admission_number text,
  current_class_id uuid references classes(id),
  status text default 'Active' check (status in ('Active','Inactive','Graduated','Transferred','Suspended')),
  medical_conditions text,
  allergies text,
  doctor_name text,
  doctor_phone text,
  created_at timestamptz default now()
);

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  first_name text not null,
  last_name text not null,
  relationship text,
  phone text not null,
  email text,
  occupation text,
  employer text,
  address text,
  is_primary_contact boolean default false,
  created_at timestamptz default now()
);

create table if not exists student_guardians (
  student_id uuid references students(id) on delete cascade,
  guardian_id uuid references guardians(id) on delete cascade,
  primary key (student_id, guardian_id)
);

-- ─── STAFF ────────────────────────────────────────────────────────────────────

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  profile_id uuid references profiles(id),
  staff_id_number text unique,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender text,
  nationality text default 'Ghanaian',
  phone text,
  email text,
  photo_url text,
  address text,
  region text,
  role text not null,
  department text,
  qualification text,
  specialization text,
  employment_type text,
  employment_status text default 'Active',
  start_date date,
  end_date date,
  salary numeric,
  bank_name text,
  bank_account text,
  social_security_number text,
  tin_number text,
  housing_allowance numeric default 0,
  transport_allowance numeric default 0,
  other_allowances numeric default 0,
  created_at timestamptz default now()
);

-- ─── ACADEMICS ────────────────────────────────────────────────────────────────

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  code text,
  category text,
  level_group text,
  is_active boolean default true
);

create table if not exists class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id),
  subject_id uuid references subjects(id),
  teacher_id uuid references staff(id),
  periods_per_week int default 5
);

create table if not exists timetable_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id),
  class_subject_id uuid references class_subjects(id),
  day_of_week int check (day_of_week between 1 and 5),
  period_number int,
  start_time time,
  end_time time,
  room text
);

-- ─── ASSESSMENTS & GRADING ────────────────────────────────────────────────────

create table if not exists assessment_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  weight_percentage numeric,
  grading_system text
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  class_subject_id uuid references class_subjects(id),
  assessment_type_id uuid references assessment_types(id),
  term_id uuid references terms(id),
  title text not null,
  total_marks numeric not null,
  date date,
  created_by uuid references profiles(id)
);

create table if not exists assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id),
  student_id uuid references students(id),
  score numeric,
  remarks text,
  is_absent boolean default false,
  created_at timestamptz default now()
);

create table if not exists report_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  term_id uuid references terms(id),
  academic_year_id uuid references academic_years(id),
  total_score numeric,
  average_score numeric,
  position_in_class int,
  position_out_of int,
  conduct text,
  attitude text,
  interest text,
  days_present int,
  days_absent int,
  days_late int,
  class_teacher_remark text,
  head_teacher_remark text,
  is_promoted boolean,
  next_class_id uuid references classes(id),
  generated_at timestamptz,
  pdf_url text
);

-- ─── ATTENDANCE ───────────────────────────────────────────────────────────────

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  date date not null,
  status text check (status in ('Present','Absent','Late','Excused')),
  marked_by uuid references profiles(id),
  remarks text,
  created_at timestamptz default now(),
  unique(student_id, date)
);

create table if not exists staff_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id),
  date date not null,
  check_in time,
  check_out time,
  status text,
  remarks text,
  unique(staff_id, date)
);

-- ─── FEES & FINANCE ───────────────────────────────────────────────────────────

create table if not exists fee_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  description text,
  is_recurring boolean default true
);

create table if not exists fee_schedules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  fee_category_id uuid references fee_categories(id),
  grade_level_id uuid references grade_levels(id),
  term_id uuid references terms(id),
  amount numeric not null,
  due_date date,
  is_mandatory boolean default true
);

create table if not exists student_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  fee_schedule_id uuid references fee_schedules(id),
  amount_due numeric not null,
  amount_paid numeric default 0,
  balance numeric generated always as (amount_due - amount_paid) stored,
  status text default 'Unpaid' check (status in ('Paid','Partial','Unpaid','Waived')),
  due_date date,
  waiver_reason text
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  student_id uuid references students(id),
  student_fee_id uuid references student_fees(id),
  amount numeric not null,
  payment_date date not null,
  payment_method text,
  mobile_money_number text,
  reference_number text unique,
  received_by uuid references profiles(id),
  receipt_number text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  category text,
  description text not null,
  amount numeric not null,
  date date not null,
  approved_by uuid references profiles(id),
  receipt_url text,
  created_at timestamptz default now()
);

-- ─── PAYROLL ──────────────────────────────────────────────────────────────────

create table if not exists payroll_runs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  month int,
  year int,
  status text default 'Draft' check (status in ('Draft','Approved','Processed','Cancelled')),
  processed_by uuid references profiles(id),
  processed_at timestamptz,
  total_gross numeric,
  total_deductions numeric,
  total_net numeric
);

create table if not exists payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid references payroll_runs(id),
  staff_id uuid references staff(id),
  basic_salary numeric,
  housing_allowance numeric default 0,
  transport_allowance numeric default 0,
  other_allowances numeric default 0,
  gross_salary numeric generated always as (basic_salary + housing_allowance + transport_allowance + other_allowances) stored,
  ssnit_employee numeric default 0,
  ssnit_employer numeric default 0,
  income_tax numeric default 0,
  other_deductions numeric default 0,
  net_salary numeric,
  payment_status text default 'Pending',
  payment_date date,
  pdf_url text
);

-- ─── LIBRARY ──────────────────────────────────────────────────────────────────

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  title text not null,
  author text,
  isbn text,
  publisher text,
  publication_year int,
  category text,
  subject_id uuid references subjects(id),
  total_copies int default 1,
  available_copies int default 1,
  location text,
  cover_url text,
  description text
);

create table if not exists book_loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id),
  borrower_id uuid references profiles(id),
  borrowed_date date not null,
  due_date date not null,
  returned_date date,
  status text default 'Borrowed' check (status in ('Borrowed','Returned','Overdue','Lost')),
  fine_amount numeric default 0,
  issued_by uuid references profiles(id)
);

-- ─── COMMUNICATION ────────────────────────────────────────────────────────────

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  title text not null,
  body text not null,
  audience text[],
  priority text default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  publish_at timestamptz default now(),
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  subject text,
  body text not null,
  sender_id uuid references profiles(id),
  recipient_ids uuid[],
  channels text[],
  status text default 'Queued',
  sent_at timestamptz,
  delivery_report jsonb
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text not null,
  body text,
  type text,
  is_read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

-- ─── TRANSPORT ────────────────────────────────────────────────────────────────

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  plate_number text not null,
  make text,
  model text,
  capacity int,
  driver_id uuid references staff(id),
  status text default 'Active',
  insurance_expiry date,
  last_service_date date,
  next_service_date date
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  vehicle_id uuid references vehicles(id),
  stops jsonb,
  monthly_fee numeric
);

create table if not exists student_transport (
  student_id uuid references students(id),
  route_id uuid references routes(id),
  pickup_stop text,
  dropoff_stop text,
  is_active boolean default true,
  primary key (student_id, route_id)
);

-- ─── INVENTORY ────────────────────────────────────────────────────────────────

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  category text,
  unit text,
  quantity int default 0,
  reorder_level int default 5,
  unit_price numeric,
  supplier text,
  location text,
  last_restocked date
);

create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references inventory_items(id),
  type text check (type in ('Restock','Issue','Disposal','Return')),
  quantity int not null,
  date date not null,
  reference text,
  notes text,
  created_by uuid references profiles(id)
);

-- ─── INNOVATIVE FEATURES ──────────────────────────────────────────────────────

create table if not exists behavior_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  recorded_by uuid references profiles(id),
  type text check (type in ('Positive','Negative','Neutral')),
  category text,
  title text not null,
  description text,
  points int default 0,
  date date not null,
  action_taken text,
  parent_notified boolean default false,
  created_at timestamptz default now()
);

create table if not exists wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  date date not null,
  mood_score int check (mood_score between 1 and 5),
  energy_score int check (energy_score between 1 and 5),
  notes text,
  flagged_for_review boolean default false,
  reviewed_by uuid references profiles(id)
);

create table if not exists parent_engagements (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id),
  student_id uuid references students(id),
  type text,
  date timestamptz default now()
);

create table if not exists lesson_plans (
  id uuid primary key default gen_random_uuid(),
  class_subject_id uuid references class_subjects(id),
  teacher_id uuid references staff(id),
  term_id uuid references terms(id),
  week_number int,
  topic text not null,
  objectives text,
  activities text,
  resources text,
  homework text,
  status text default 'Draft',
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

alter table schools enable row level security;
alter table academic_years enable row level security;
alter table terms enable row level security;
alter table profiles enable row level security;
alter table grade_levels enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table guardians enable row level security;
alter table student_guardians enable row level security;
alter table staff enable row level security;
alter table subjects enable row level security;
alter table class_subjects enable row level security;
alter table timetable_slots enable row level security;
alter table assessments enable row level security;
alter table assessment_scores enable row level security;
alter table report_cards enable row level security;
alter table attendance enable row level security;
alter table staff_attendance enable row level security;
alter table fee_categories enable row level security;
alter table fee_schedules enable row level security;
alter table student_fees enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table payroll_runs enable row level security;
alter table payslips enable row level security;
alter table books enable row level security;
alter table book_loans enable row level security;
alter table announcements enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table vehicles enable row level security;
alter table routes enable row level security;
alter table student_transport enable row level security;
alter table inventory_items enable row level security;
alter table inventory_transactions enable row level security;
alter table behavior_records enable row level security;
alter table wellness_checkins enable row level security;
alter table parent_engagements enable row level security;
alter table lesson_plans enable row level security;

-- ─── RLS POLICIES (base — restrict to own school) ─────────────────────────────

-- Helper function: get the school_id for the logged-in user
create or replace function get_my_school_id()
returns uuid
language sql
stable
as $$
  select school_id from profiles where id = auth.uid()
$$;

-- Generic policy: users can only see data from their own school
-- Apply this pattern to each table:

create policy "School isolation: schools"
  on schools for all
  using (id = get_my_school_id());

create policy "School isolation: students"
  on students for all
  using (school_id = get_my_school_id());

create policy "School isolation: staff"
  on staff for all
  using (school_id = get_my_school_id());

create policy "School isolation: classes"
  on classes for all
  using (school_id = get_my_school_id());

create policy "School isolation: academic_years"
  on academic_years for all
  using (school_id = get_my_school_id());

create policy "School isolation: terms"
  on terms for all
  using (school_id = get_my_school_id());

create policy "School isolation: grade_levels"
  on grade_levels for all
  using (school_id = get_my_school_id());

create policy "School isolation: subjects"
  on subjects for all
  using (school_id = get_my_school_id());

create policy "School isolation: class_subjects"
  on class_subjects for all
  using (
    class_id in (
      select id from classes where school_id = get_my_school_id()
    )
  );

create policy "School isolation: timetable_slots"
  on timetable_slots for all
  using (
    class_id in (
      select id from classes where school_id = get_my_school_id()
    )
  );

create policy "School isolation: payments"
  on payments for all
  using (school_id = get_my_school_id());

create policy "School isolation: payslips"
  on payslips for all
  using (
    payroll_run_id in (
      select id from payroll_runs where school_id = get_my_school_id()
    )
  );

-- Profiles: users can see their own profile ONLY
-- ✅ FIXED: Removed all circular logic - no subqueries that touch profiles table
create policy "Profiles: read own"
  on profiles for select
  using (id = auth.uid());

create policy "Profiles: update own"
  on profiles for update
  using (id = auth.uid());

create policy "Profiles: insert own"
  on profiles for insert
  with check (id = auth.uid());

-- Notifications: users see only their own
create policy "Notifications: own only"
  on notifications for all
  using (user_id = auth.uid());

-- NOTE: Add more granular policies per role (admin vs teacher vs student vs parent)
-- as you build out each module in later phases.
