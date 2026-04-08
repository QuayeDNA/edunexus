-- Enable/normalize RLS policies required for attendance module tables.
-- Safe to run multiple times.

alter table attendance enable row level security;
alter table staff_attendance enable row level security;

alter table attendance add column if not exists is_admin_override boolean not null default false;
alter table attendance add column if not exists override_reason text;
alter table attendance add column if not exists overridden_at timestamptz;

-- Role helper functions used by split attendance policies.
create or replace function get_my_role()
returns text
language sql
stable
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_admin_or_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(get_my_role() in ('admin', 'super_admin'), false)
$$;

create or replace function is_teacher_user()
returns boolean
language sql
stable
as $$
  select coalesce(get_my_role() = 'teacher', false)
$$;

create or replace function get_attendance_lock_window_hours()
returns integer
language sql
stable
as $$
  select 48
$$;

create or replace function is_attendance_within_lock_window(target_date date)
returns boolean
language sql
stable
as $$
  select
    (now() at time zone 'utc') <= (
      (target_date::timestamp + interval '1 day')
      + make_interval(hours => get_attendance_lock_window_hours())
    )
$$;

-- Drop legacy and previously generated attendance policies.
drop policy if exists "School isolation: attendance" on attendance;
drop policy if exists "Attendance: admin select" on attendance;
drop policy if exists "Attendance: admin insert" on attendance;
drop policy if exists "Attendance: admin update" on attendance;
drop policy if exists "Attendance: admin delete" on attendance;
drop policy if exists "Attendance: teacher select own classes" on attendance;
drop policy if exists "Attendance: teacher insert own classes" on attendance;
drop policy if exists "Attendance: teacher update own classes" on attendance;

drop policy if exists "School isolation: staff_attendance" on staff_attendance;
drop policy if exists "Staff attendance: admin select" on staff_attendance;
drop policy if exists "Staff attendance: admin insert" on staff_attendance;
drop policy if exists "Staff attendance: admin update" on staff_attendance;
drop policy if exists "Staff attendance: admin delete" on staff_attendance;

-- ADMIN: full attendance access (view, mark, edit, delete) in own school.
create policy "Attendance: admin select"
  on attendance for select
  using (
    is_admin_or_super_admin()
    and class_id in (
      select id from classes where school_id = get_my_school_id()
    )
    and student_id in (
      select id from students where school_id = get_my_school_id()
    )
  );

create policy "Attendance: admin insert"
  on attendance for insert
  with check (
    is_admin_or_super_admin()
    and class_id in (
      select id from classes where school_id = get_my_school_id()
    )
    and student_id in (
      select id from students where school_id = get_my_school_id()
    )
    and (
      is_attendance_within_lock_window(date)
      or (
        coalesce(is_admin_override, false) = true
        and coalesce(length(trim(override_reason)), 0) > 0
      )
    )
  );

create policy "Attendance: admin update"
  on attendance for update
  using (
    is_admin_or_super_admin()
    and class_id in (
      select id from classes where school_id = get_my_school_id()
    )
    and student_id in (
      select id from students where school_id = get_my_school_id()
    )
  )
  with check (
    is_admin_or_super_admin()
    and class_id in (
      select id from classes where school_id = get_my_school_id()
    )
    and student_id in (
      select id from students where school_id = get_my_school_id()
    )
    and (
      is_attendance_within_lock_window(date)
      or (
        coalesce(is_admin_override, false) = true
        and coalesce(length(trim(override_reason)), 0) > 0
      )
    )
  );

create policy "Attendance: admin delete"
  on attendance for delete
  using (
    is_admin_or_super_admin()
    and class_id in (
      select id from classes where school_id = get_my_school_id()
    )
    and student_id in (
      select id from students where school_id = get_my_school_id()
    )
  );

-- TEACHER: class-scoped attendance view and marking permissions.
create policy "Attendance: teacher select own classes"
  on attendance for select
  using (
    is_teacher_user()
    and class_id in (
      select id
      from classes
      where school_id = get_my_school_id()
        and class_teacher_id = auth.uid()
    )
    and student_id in (
      select id from students where school_id = get_my_school_id()
    )
  );

create policy "Attendance: teacher insert own classes"
  on attendance for insert
  with check (
    is_teacher_user()
    and class_id in (
      select id
      from classes
      where school_id = get_my_school_id()
        and class_teacher_id = auth.uid()
    )
    and student_id in (
      select id
      from students
      where school_id = get_my_school_id()
        and current_class_id = class_id
    )
    and is_attendance_within_lock_window(date)
    and coalesce(is_admin_override, false) = false
    and coalesce(length(trim(override_reason)), 0) = 0
  );

create policy "Attendance: teacher update own classes"
  on attendance for update
  using (
    is_teacher_user()
    and class_id in (
      select id
      from classes
      where school_id = get_my_school_id()
        and class_teacher_id = auth.uid()
    )
    and student_id in (
      select id
      from students
      where school_id = get_my_school_id()
        and current_class_id = class_id
    )
    and is_attendance_within_lock_window(date)
  )
  with check (
    is_teacher_user()
    and class_id in (
      select id
      from classes
      where school_id = get_my_school_id()
        and class_teacher_id = auth.uid()
    )
    and student_id in (
      select id
      from students
      where school_id = get_my_school_id()
        and current_class_id = class_id
    )
    and is_attendance_within_lock_window(date)
    and coalesce(is_admin_override, false) = false
    and coalesce(length(trim(override_reason)), 0) = 0
  );

-- STAFF ATTENDANCE: admin-managed in own school.
create policy "Staff attendance: admin select"
  on staff_attendance for select
  using (
    is_admin_or_super_admin()
    and staff_id in (
      select id from staff where school_id = get_my_school_id()
    )
  );

create policy "Staff attendance: admin insert"
  on staff_attendance for insert
  with check (
    is_admin_or_super_admin()
    and staff_id in (
      select id from staff where school_id = get_my_school_id()
    )
  );

create policy "Staff attendance: admin update"
  on staff_attendance for update
  using (
    is_admin_or_super_admin()
    and staff_id in (
      select id from staff where school_id = get_my_school_id()
    )
  )
  with check (
    is_admin_or_super_admin()
    and staff_id in (
      select id from staff where school_id = get_my_school_id()
    )
  );

create policy "Staff attendance: admin delete"
  on staff_attendance for delete
  using (
    is_admin_or_super_admin()
    and staff_id in (
      select id from staff where school_id = get_my_school_id()
    )
  );
