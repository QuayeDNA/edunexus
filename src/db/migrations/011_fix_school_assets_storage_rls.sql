-- Fix Supabase Storage RLS policies for school-assets uploads used by logos and expense receipts.
-- Safe to run multiple times.

-- NOTE: Do not run ALTER TABLE on storage.objects in hosted Supabase projects.
-- RLS is managed by Supabase and already enabled for storage.objects.

create or replace function get_my_school_id()
returns uuid
language sql
stable
as $$
  select school_id from profiles where id = auth.uid()
$$;

-- Remove any old policy variants first.
drop policy if exists "school_assets_public_read" on storage.objects;
drop policy if exists "school_assets_auth_insert" on storage.objects;
drop policy if exists "school_assets_auth_update" on storage.objects;
drop policy if exists "school_assets_auth_delete" on storage.objects;

-- Public read supports logo/receipt URLs rendered directly in the app.
create policy "school_assets_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'school-assets');

-- Authenticated users can only write inside their own school folder.
-- Supported paths:
--   1) <school_id>/...
--   2) schools/<school_id>/...
create policy "school_assets_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'school-assets'
    and auth.uid() is not null
    and (
      split_part(name, '/', 1) = get_my_school_id()::text
      or (
        split_part(name, '/', 1) = 'schools'
        and split_part(name, '/', 2) = get_my_school_id()::text
      )
    )
  );

create policy "school_assets_auth_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'school-assets'
    and auth.uid() is not null
    and (
      split_part(name, '/', 1) = get_my_school_id()::text
      or (
        split_part(name, '/', 1) = 'schools'
        and split_part(name, '/', 2) = get_my_school_id()::text
      )
    )
  )
  with check (
    bucket_id = 'school-assets'
    and auth.uid() is not null
    and (
      split_part(name, '/', 1) = get_my_school_id()::text
      or (
        split_part(name, '/', 1) = 'schools'
        and split_part(name, '/', 2) = get_my_school_id()::text
      )
    )
  );

create policy "school_assets_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'school-assets'
    and auth.uid() is not null
    and (
      split_part(name, '/', 1) = get_my_school_id()::text
      or (
        split_part(name, '/', 1) = 'schools'
        and split_part(name, '/', 2) = get_my_school_id()::text
      )
    )
  );
