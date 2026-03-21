# EduNexus — Supabase Setup Guide

Complete step-by-step instructions to configure your Supabase backend.

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **"New project"**
3. Fill in:
   - **Name**: `edunexus`
   - **Database Password**: generate a strong one and save it
   - **Region**: `West EU (Ireland)` is closest to Ghana/West Africa
4. Click **"Create new project"** — wait ~2 minutes

---

## Step 2 — Copy Your API Keys

Go to **Settings → API** and copy into `.env.local`:

```bash
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ Never commit `.env.local`. It is already in `.gitignore`.

---

## Step 3 — Run the Database Schema

1. Go to **SQL Editor** in your dashboard
2. Click **"New query"**
3. Paste the entire contents of `src/db/schema.sql`
4. Click **"Run"** (green button)

This creates all 35+ tables, RLS policies, and helper functions.

---

## Step 4 — Storage Buckets

Go to **Storage** and create these buckets:

| Bucket Name      | Public | Use                          |
|------------------|--------|------------------------------|
| `school-assets`  | ✅ Yes  | Logos, branding               |
| `student-photos` | ✅ Yes  | Student profile photos        |
| `documents`      | ❌ No   | Private documents, PDFs       |
| `receipts`       | ❌ No   | Payment receipts              |

For each bucket click **"New policy"** → **"For full customization"** and add:

```sql
-- Public buckets: allow authenticated reads
CREATE POLICY "allow_authenticated_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id IN ('school-assets', 'student-photos'));

-- Allow authenticated uploads
CREATE POLICY "allow_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Step 5 — Authentication Settings

Go to **Authentication → Settings**:

- **Site URL**: `http://localhost:5173` (dev), `https://yourdomain.com` (prod)
- **Redirect URLs**: Add both `http://localhost:5173/**` and your prod URL
- **Email Confirmations**: Enable for production, disable for faster dev testing

---

## Step 6 — Enable Realtime

Go to **Database → Replication** and enable for:

| Table           | Why                              |
|-----------------|----------------------------------|
| `attendance`    | Live attendance dashboard        |
| `notifications` | Bell icon updates                |
| `announcements` | Broadcast to all users           |
| `payments`      | Live fee collection feed         |

---

## Step 7 — Add Granular RLS Policies

Run this in the SQL Editor **after** the main schema:

```sql
-- Grade levels, terms, subjects — school-wide read
CREATE POLICY "grade_levels_read" ON grade_levels FOR SELECT
  TO authenticated USING (school_id = get_my_school_id());

CREATE POLICY "terms_read" ON terms FOR SELECT
  TO authenticated USING (school_id = get_my_school_id());

CREATE POLICY "subjects_read" ON subjects FOR SELECT
  TO authenticated USING (school_id = get_my_school_id());

CREATE POLICY "classes_read" ON classes FOR SELECT
  TO authenticated USING (school_id = get_my_school_id());

CREATE POLICY "academic_years_read" ON academic_years FOR SELECT
  TO authenticated USING (school_id = get_my_school_id());

-- Admin write on grade_levels, terms, classes
CREATE POLICY "admin_grade_levels_write" ON grade_levels FOR ALL
  TO authenticated
  USING (school_id = get_my_school_id()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

CREATE POLICY "admin_classes_write" ON classes FOR ALL
  TO authenticated
  USING (school_id = get_my_school_id()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));

-- Announcements: school-wide read
CREATE POLICY "announcements_read" ON announcements FOR SELECT
  TO authenticated USING (school_id = get_my_school_id());

-- Fees: admin write, student/parent read own
CREATE POLICY "fee_schedules_read" ON fee_schedules FOR SELECT
  TO authenticated USING (school_id = get_my_school_id());

CREATE POLICY "student_fees_read" ON student_fees FOR SELECT
  TO authenticated
  USING (student_id IN (
    SELECT id FROM students WHERE school_id = get_my_school_id()
  ));

-- Expenses: admin only
CREATE POLICY "expenses_admin" ON expenses FOR ALL
  TO authenticated
  USING (school_id = get_my_school_id()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','super_admin'));
```

---

## Step 8 — Seed Development Data

```bash
npm run seed
```

Creates: 1 school, 14 grade levels, 5 classes, 30 students, 3 terms.

**Demo login:** `admin@edunexus.demo` / `Demo1234!`

---

## Step 9 — Verify

```bash
npm run dev
# Open http://localhost:5173
# Login with demo account — dashboard should load
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid API key" | Check `.env.local`, restart `npm run dev` |
| 403 errors in console | RLS blocking — check policies in Auth → Policies |
| Schema errors | Run in fresh DB; use Supabase reset if needed |
| Realtime not firing | Enable table replication in Database → Replication |

---

*EduNexus · Supabase Setup · Phase 1*
