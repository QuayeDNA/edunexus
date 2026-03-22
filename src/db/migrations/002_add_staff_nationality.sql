-- Add missing nationality column to staff table.
-- Fixes: PGRST204 "Could not find the 'nationality' column of 'staff' in the schema cache"

alter table if exists staff
  add column if not exists nationality text default 'Ghanaian';

-- Backfill existing rows where nationality is null.
update staff
set nationality = 'Ghanaian'
where nationality is null;
