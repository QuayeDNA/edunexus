-- Enable/normalize RLS policies required for assessments module tables.
-- Safe to run multiple times.

alter table assessment_types enable row level security;
alter table assessments enable row level security;
alter table assessment_scores enable row level security;

-- Assessment types are school-scoped directly.
drop policy if exists "School isolation: assessment_types" on assessment_types;
create policy "School isolation: assessment_types"
  on assessment_types for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Assessments are scoped via class_subject -> class -> school.
drop policy if exists "School isolation: assessments" on assessments;
create policy "School isolation: assessments"
  on assessments for all
  using (
    class_subject_id in (
      select cs.id
      from class_subjects cs
      join classes c on c.id = cs.class_id
      where c.school_id = get_my_school_id()
    )
  )
  with check (
    class_subject_id in (
      select cs.id
      from class_subjects cs
      join classes c on c.id = cs.class_id
      where c.school_id = get_my_school_id()
    )
  );

-- Scores are scoped via assessment -> class_subject -> class -> school.
drop policy if exists "School isolation: assessment_scores" on assessment_scores;
create policy "School isolation: assessment_scores"
  on assessment_scores for all
  using (
    assessment_id in (
      select a.id
      from assessments a
      join class_subjects cs on cs.id = a.class_subject_id
      join classes c on c.id = cs.class_id
      where c.school_id = get_my_school_id()
    )
  )
  with check (
    assessment_id in (
      select a.id
      from assessments a
      join class_subjects cs on cs.id = a.class_subject_id
      join classes c on c.id = cs.class_id
      where c.school_id = get_my_school_id()
    )
  );
