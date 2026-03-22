-- Synchronize student/staff table columns with all fields used by admin forms.
-- This migration is idempotent and safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- STAFF: fields used by StaffNewPage + StaffDetailPage
-- ─────────────────────────────────────────────────────────────────────────────
alter table if exists staff add column if not exists date_of_birth date;
alter table if exists staff add column if not exists gender text;
alter table if exists staff add column if not exists nationality text default 'Ghanaian';
alter table if exists staff add column if not exists phone text;
alter table if exists staff add column if not exists email text;
alter table if exists staff add column if not exists photo_url text;
alter table if exists staff add column if not exists address text;
alter table if exists staff add column if not exists region text;
alter table if exists staff add column if not exists role text;
alter table if exists staff add column if not exists department text;
alter table if exists staff add column if not exists qualification text;
alter table if exists staff add column if not exists specialization text;
alter table if exists staff add column if not exists employment_type text;
alter table if exists staff add column if not exists employment_status text default 'Active';
alter table if exists staff add column if not exists start_date date;
alter table if exists staff add column if not exists end_date date;
alter table if exists staff add column if not exists staff_id_number text;
alter table if exists staff add column if not exists salary numeric;
alter table if exists staff add column if not exists housing_allowance numeric default 0;
alter table if exists staff add column if not exists transport_allowance numeric default 0;
alter table if exists staff add column if not exists other_allowances numeric default 0;
alter table if exists staff add column if not exists bank_name text;
alter table if exists staff add column if not exists bank_account text;
alter table if exists staff add column if not exists social_security_number text;
alter table if exists staff add column if not exists tin_number text;

-- Backfill nullable defaults used by forms.
update staff set nationality = 'Ghanaian' where nationality is null;
update staff set employment_status = 'Active' where employment_status is null;
update staff set housing_allowance = 0 where housing_allowance is null;
update staff set transport_allowance = 0 where transport_allowance is null;
update staff set other_allowances = 0 where other_allowances is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- STUDENTS: fields used by StudentNewPage + StudentDetailPage
-- ─────────────────────────────────────────────────────────────────────────────
alter table if exists students add column if not exists other_names text;
alter table if exists students add column if not exists date_of_birth date;
alter table if exists students add column if not exists gender text;
alter table if exists students add column if not exists nationality text default 'Ghanaian';
alter table if exists students add column if not exists religion text;
alter table if exists students add column if not exists blood_type text;
alter table if exists students add column if not exists photo_url text;
alter table if exists students add column if not exists address text;
alter table if exists students add column if not exists city text;
alter table if exists students add column if not exists region text;
alter table if exists students add column if not exists admission_date date;
alter table if exists students add column if not exists admission_number text;
alter table if exists students add column if not exists current_class_id uuid references classes(id);
alter table if exists students add column if not exists status text default 'Active';
alter table if exists students add column if not exists medical_conditions text;
alter table if exists students add column if not exists allergies text;
alter table if exists students add column if not exists doctor_name text;
alter table if exists students add column if not exists doctor_phone text;

-- Backfill nullable defaults used by forms.
update students set nationality = 'Ghanaian' where nationality is null;
update students set status = 'Active' where status is null;
