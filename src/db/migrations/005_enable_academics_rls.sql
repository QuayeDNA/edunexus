-- Enable/normalize RLS policies required for Academics module tables.
-- Safe to run multiple times.

-- Academic years
drop policy if exists "School isolation: academic_years" on academic_years;
create policy "School isolation: academic_years"
  on academic_years for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Terms
drop policy if exists "School isolation: terms" on terms;
create policy "School isolation: terms"
  on terms for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Grade levels
drop policy if exists "School isolation: grade_levels" on grade_levels;
create policy "School isolation: grade_levels"
  on grade_levels for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Subjects
drop policy if exists "School isolation: subjects" on subjects;
create policy "School isolation: subjects"
  on subjects for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Class-subject mappings (no direct school_id column, enforce via class ownership)
drop policy if exists "School isolation: class_subjects" on class_subjects;
create policy "School isolation: class_subjects"
  on class_subjects for all
  using (
    class_id in (
      select id from classes where school_id = get_my_school_id()
    )
  )
  with check (
    class_id in (
      select id from classes where school_id = get_my_school_id()
    )
  );
