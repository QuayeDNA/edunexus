-- Enable/normalize schema + RLS policies required for payroll module tables.
-- Safe to run multiple times.

create or replace function get_my_school_id()
returns uuid
language sql
stable
as $$
  select school_id from profiles where id = auth.uid()
$$;

-- Payroll tables (created if missing)
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
  payroll_run_id uuid references payroll_runs(id) on delete cascade,
  staff_id uuid references staff(id),
  basic_salary numeric,
  housing_allowance numeric default 0,
  transport_allowance numeric default 0,
  other_allowances numeric default 0,
  gross_salary numeric generated always as (
    basic_salary + housing_allowance + transport_allowance + other_allowances
  ) stored,
  ssnit_employee numeric default 0,
  ssnit_employer numeric default 0,
  income_tax numeric default 0,
  other_deductions numeric default 0,
  net_salary numeric,
  payment_status text default 'Pending',
  payment_date date,
  pdf_url text
);

-- Helpful indexes for payroll history + reports
create index if not exists idx_payroll_runs_school_year_month on payroll_runs(school_id, year, month);
create index if not exists idx_payroll_runs_status on payroll_runs(status);
create index if not exists idx_payslips_payroll_run_id on payslips(payroll_run_id);
create index if not exists idx_payslips_staff_id on payslips(staff_id);
create index if not exists idx_payslips_payment_status on payslips(payment_status);
create index if not exists idx_payslips_payment_date on payslips(payment_date);

-- Enable row level security
alter table payroll_runs enable row level security;
alter table payslips enable row level security;

-- Payroll runs are school-scoped directly
 drop policy if exists "School isolation: payroll_runs" on payroll_runs;
create policy "School isolation: payroll_runs"
  on payroll_runs for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Payslips are scoped through linked payroll run
 drop policy if exists "School isolation: payslips" on payslips;
create policy "School isolation: payslips"
  on payslips for all
  using (
    payroll_run_id in (
      select id from payroll_runs where school_id = get_my_school_id()
    )
  )
  with check (
    payroll_run_id in (
      select id from payroll_runs where school_id = get_my_school_id()
    )
  );
