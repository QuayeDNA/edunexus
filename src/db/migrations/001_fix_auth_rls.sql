-- 🔧 FIX: Authentication Infinite Loading Issue
-- Run this in Supabase SQL Editor to fix RLS circular dependency and auth state restoration

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Drop ALL broken profiles policies
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Profiles: own or same school" on profiles;
drop policy if exists "Profiles: read own profile" on profiles;
drop policy if exists "Profiles: update own profile" on profiles;
drop policy if exists "Profiles: admin can view all in school" on profiles;
drop policy if exists "Profiles: allow insert own" on profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Create SIMPLE policies WITHOUT circular recursion
-- ─────────────────────────────────────────────────────────────────────────────

-- ✅ CRITICAL: Allow ALL authenticated users to read their own profile
-- This is the ONLY policy needed for auth to work
create policy "Profiles: read own"
  on profiles for select
  using (id = auth.uid());

-- ✅ Allow users to update their own profile
create policy "Profiles: update own"
  on profiles for update
  using (id = auth.uid());

-- ✅ Allow users to insert their own profile during signup
create policy "Profiles: insert own"
  on profiles for insert
  with check (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Admin access to view other profiles will be handled via:
-- 1. Application-level checks (check role in frontend/API)
-- 2. Bypassing RLS with supabase service role in backend
-- Do NOT try to query profiles table from within RLS policies - causes recursion!
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Test that you can read your own profile
-- ─────────────────────────────────────────────────────────────────────────────
-- After running above, test with:
-- SELECT * FROM profiles WHERE id = auth.uid();
-- Should return YOUR profile without "infinite recursion" error

