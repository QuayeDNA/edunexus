-- Adds school lifecycle status to support super-admin suspension/reactivation.
-- Safe to run multiple times.

alter table schools
  add column if not exists lifecycle_status text;

update schools
set lifecycle_status = 'active'
where lifecycle_status is null;

alter table schools
  alter column lifecycle_status set default 'active';

alter table schools
  alter column lifecycle_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'schools_lifecycle_status_check'
  ) then
    alter table schools
      add constraint schools_lifecycle_status_check
      check (lifecycle_status in ('active','suspended'));
  end if;
end $$;
