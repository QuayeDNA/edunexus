-- Fix Supabase Storage RLS for student/staff image uploads.
-- Error fixed: "new row violates row-level security policy"

-- NOTE: Do not run ALTER TABLE on storage.objects in hosted Supabase projects.
-- The table is managed by Supabase and owner-level DDL is not permitted.
-- RLS is already enabled for storage.objects by default.

-- Remove conflicting policies for this bucket if they already exist.
drop policy if exists "student_photos_public_read" on storage.objects;
drop policy if exists "student_photos_auth_insert" on storage.objects;
drop policy if exists "student_photos_auth_update" on storage.objects;
drop policy if exists "student_photos_auth_delete" on storage.objects;

-- Public read so image URLs work in avatars without signed URLs.
create policy "student_photos_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'student-photos');

-- Authenticated users can upload to student-photos bucket.
create policy "student_photos_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'student-photos'
    and auth.uid() is not null
  );

-- Required for upsert:true uploads when object path already exists.
create policy "student_photos_auth_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'student-photos'
    and auth.uid() is not null
  )
  with check (
    bucket_id = 'student-photos'
    and auth.uid() is not null
  );

-- Allow authenticated cleanup/replacement.
create policy "student_photos_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'student-photos'
    and auth.uid() is not null
  );
