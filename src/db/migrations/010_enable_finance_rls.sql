-- Enable/normalize schema + RLS policies required for finance module tables.
-- Safe to run multiple times.

create or replace function get_my_school_id()
returns uuid
language sql
stable
as $$
  select school_id from profiles where id = auth.uid()
$$;

-- Finance tables (created if missing)
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

-- Helpful indexes for dashboard + finance queries
create index if not exists idx_fee_categories_school_id on fee_categories(school_id);
create index if not exists idx_fee_schedules_school_term on fee_schedules(school_id, term_id);
create index if not exists idx_fee_schedules_grade_level_id on fee_schedules(grade_level_id);
create index if not exists idx_student_fees_schedule_id on student_fees(fee_schedule_id);
create index if not exists idx_student_fees_student_id on student_fees(student_id);
create index if not exists idx_student_fees_status_due_date on student_fees(status, due_date);
create index if not exists idx_payments_school_payment_date on payments(school_id, payment_date);
create index if not exists idx_payments_student_fee_id on payments(student_fee_id);
create index if not exists idx_payments_student_id on payments(student_id);
create index if not exists idx_expenses_school_date on expenses(school_id, date);

-- Enable row level security
alter table fee_categories enable row level security;
alter table fee_schedules enable row level security;
alter table student_fees enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;

-- Fee categories are school-scoped directly
 drop policy if exists "School isolation: fee_categories" on fee_categories;
create policy "School isolation: fee_categories"
  on fee_categories for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Fee schedules are school-scoped directly
 drop policy if exists "School isolation: fee_schedules" on fee_schedules;
create policy "School isolation: fee_schedules"
  on fee_schedules for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Student fees are scoped through both linked student and linked schedule
 drop policy if exists "School isolation: student_fees" on student_fees;
create policy "School isolation: student_fees"
  on student_fees for all
  using (
    student_id in (
      select id from students where school_id = get_my_school_id()
    )
    and fee_schedule_id in (
      select id from fee_schedules where school_id = get_my_school_id()
    )
  )
  with check (
    student_id in (
      select id from students where school_id = get_my_school_id()
    )
    and fee_schedule_id in (
      select id from fee_schedules where school_id = get_my_school_id()
    )
  );

-- Payments are school-scoped directly
 drop policy if exists "School isolation: payments" on payments;
create policy "School isolation: payments"
  on payments for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Expenses are school-scoped directly
 drop policy if exists "School isolation: expenses" on expenses;
create policy "School isolation: expenses"
  on expenses for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());
