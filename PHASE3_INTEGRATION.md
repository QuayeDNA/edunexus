# Phase 3 Integration Guide — Students & Staff Management

> **Status**: ✅ Phase 3 Complete & Verified  
> **Date**: March 21, 2026  
> **Version**: 1.0

---

## 📋 Overview

Phase 3 adds **end-to-end data management** for **Students** and **Staff** — the core operational entities in EduNexus. This phase includes:

- ✅ Student list, create, detail, edit, delete workflows
- ✅ Staff list, create, detail, edit, delete workflows
- ✅ Integrated with existing Supabase schemas
- ✅ Form validation, error handling, loading states
- ✅ Proper role-based access (admin only)

---

## ✅ Phase 2 Completion Checklist

Before Phase 3, verify Phase 2 is fully complete:

| Feature | Status | Confirmed |
|---------|--------|-----------|
| Auth system (login/register/logout) | ✅ Built | Feb 2026 |
| Supabase RLS policies (fixed) | ✅ Fixed | Mar 21, 2026 |
| Base database schema | ✅ Built | Feb 2026 |
| API services (auth, classes, students, staff, etc.) | ✅ Built | Feb 2026 |
| React hooks (useStudents, useStaff, etc.) | ✅ Built | Feb 2026 |
| Admin/Teacher/Student/Parent dashboards | ✅ Stubbed | Feb 2026 |
| Routing + Protected routes | ✅ Built | Feb 2026 |
| UI Kit (DataTable, StatusBadge, etc.) | ✅ Built | Feb 2026 |

**Action**: If any item is not confirmed, run Phase 2 setup before continuing.

---

## 🎯 Phase 3 Features

### Students Management
**File**: [src/pages/admin/students/](src/pages/admin/students/)

| Item | Feature |
|------|---------|
| **StudentsPage.jsx** | List all students (table), search, filter, create button |
| **StudentNewPage.jsx** | Create new student (form with validation) |
| **StudentDetailPage.jsx** | View, edit, delete individual student |

**Hooks Used**: `useStudents()` from `src/hooks/useStudents.js`

**Form Fields**:
- First Name, Last Name, ID Number (unique)
- Date of Birth, Gender, Religion
- Nationality, Blood Type
- Address, Photo URL
- Assigned Class (FK to classes table)

### Staff Management
**File**: [src/pages/admin/staff/](src/pages/admin/staff/)

| Item | Feature |
|------|---------|
| **StaffPage.jsx** | List all staff (table), search, filter, create button |
| **StaffNewPage.jsx** | Create new staff member (form with validation) |
| **StaffDetailPage.jsx** | View, edit, delete individual staff |

**Hooks Used**: `useStaff()` from `src/hooks/useStaff.js`

**Form Fields**:
- First Name, Last Name, ID Number (unique)
- Email, Phone, Role (admin/teacher/support)
- Department, Hired Date
- Status (active/inactive)

---

## 🚀 Setup & Configuration

### Prerequisites
- Phase 2 already complete (auth working, RLS fixed)
- Dev server running: `npm run dev`
- Supabase project connected + seeded with test data

### Database Verification

Before using Phase 3, verify these tables exist in Supabase:

```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('students', 'staff', 'profiles', 'schools', 'classes');
```

Expected tables:
- ✓ `schools`
- ✓ `classes`
- ✓ `students`
- ✓ `staff`
- ✓ `profiles`

### RLS Policies Check

Verify RLS is properly configured on students/staff tables. Go to **Supabase Dashboard** → **Authentication** → **Policies**:

For **students** table, you should see:
- `School isolation: students` - users can only see students in their school

For **staff** table, you should see:
- `School isolation: staff` - users can only see staff in their school

### Code Changes in Phase 3

No new dependencies required. Phase 3 uses existing services:

```
src/services/api/
  ├── students.js (pre-built)
  └── staff.js (pre-built)

src/hooks/
  ├── useStudents.js (pre-built)
  └── useStaff.js (pre-built)

src/pages/admin/
  ├── students/ (NEW - 3 pages)
  └── staff/ (NEW - 3 pages)
```

---

## 🧪 Testing & Verification

### Step 1: Start Dev Server
```bash
npm run dev
```
Wait for "Local: http://localhost:5173" message.

### Step 2: Login as Admin
1. Go to http://localhost:5173/login
2. Login with admin credentials:
   - Email: `admin@test.edu.gh`
   - Password: (from your seed).

3. Complete onboarding if prompted (select a school)

### Step 3: Test Students Workflow

#### Test 3.1: View Student List
1. Go to **Admin** → **Students**
2. Should see a table with existing students
3. Search box should filter by name/ID
4. Table should show columns: Name | ID | Class | Status

#### Test 3.2: Create Student
1. Click **+ New Student**
2. Fill in form:
   - First Name: "John"
   - Last Name: "Doe"
   - ID Number: "STU-2026-001"
   - DOB: Any date
   - Gender: Male
   - Class: Select any class
3. Click **Create**
4. Should redirect to student detail page
5. Student should appear in list

#### Test 3.3: Edit Student
1. From list, click any student row
2. Click **Edit** button
3. Change a field (e.g., phone number)
4. Click **Save**
5. Confirm change persisted (close/reopen)

#### Test 3.4: Delete Student
1. From detail page, click **Delete**
2. Confirm deletion in modal
3. Should redirect to list
4. Student should be gone

### Step 4: Test Staff Workflow

Repeat all steps 3.1-3.4 but with:
- Route: **Admin** → **Staff**
- Form fields: First Name, Last Name, Email, Phone, Role (admin/teacher/support)
- Create test: Email must be unique

### Step 5: Check Console for Errors

Open browser DevTools (**F12**):
- **Console tab**: No red errors
- **Network tab**: API requests succeed (200-201 status)
- **Application** → **Local Storage**: Session token present

### Step 6: Verify Database Changes

After creating/editing, verify in Supabase:

```sql
-- Check students table
SELECT id, first_name, last_name, student_id_number, school_id 
FROM students 
ORDER BY created_at DESC 
LIMIT 5;

-- Check staff table
SELECT id, first_name, last_name, staff_id_number, role, school_id 
FROM staff 
ORDER BY created_at DESC 
LIMIT 5;
```

New records should appear immediately.

---

## 🔧 Troubleshooting

### Issue: "No data" in student/staff list
**Cause**: No students/staff created yet in Supabase
**Fix**: 
1. Seed database: `npm run seed`
2. Or manually create test data in Supabase
3. Refresh page

### Issue: "Unauthorized" error on form submit
**Cause**: RLS policy blocking write access
**Fix**:
1. Verify user is logged in as admin
2. Verify user's profile has `role = 'admin'` in Supabase
3. Check RLS policies are correct (see Setup section)

### Issue: "Duplicate key" error when creating
**Cause**: ID number or email already exists
**Fix**: Use a unique ID/email and try again

### Issue: Edit/delete buttons not showing
**Cause**: Wrong user role or data loading failed
**Fix**:
1. Check browser console for errors
2. Verify user is admin
3. Try hard refresh (Ctrl+R)

---

## 📊 Data Schema Reference

### Students Table

```javascript
{
  id: uuid,                    // Primary Key
  school_id: uuid,            // FK to schools
  profile_id: uuid,           // FK to profiles (if student has login)
  first_name: string,
  last_name: string,
  student_id_number: string,  // Unique per school
  date_of_birth: date,
  gender: enum('Male','Female','Other'),
  nationality: string,
  religion: string,
  blood_type: string,
  photo_url: string,
  address: string,
  class_id: uuid,             // FK to classes (current class)
  is_active: boolean,
  created_at: timestamp,
}
```

### Staff Table

```javascript
{
  id: uuid,                    // Primary Key
  school_id: uuid,            // FK to schools
  profile_id: uuid,           // FK to profiles (staff user account)
  first_name: string,
  last_name: string,
  staff_id_number: string,    // Unique per school
  email: string,              // Unique per school
  phone: string,
  role: enum('admin','teacher','support'),
  department: string,
  hired_date: date,
  is_active: boolean,
  created_at: timestamp,
}
```

---

## 🎬 Next Phase (Phase 4)

Once Phase 3 is verified working, Phase 4 will add:

1. **Academics Management**
   - Grade Levels (Primary 1-6, JHS 1-3, SHS 1-3)
   - Classes (Primary 1A, JHS 2B, etc.)
   - Subjects (Math, English, Science, etc.)
   - Class-Subject assignments

2. **Assessments & Grading**
   - Create assessments (tests, quizzes, exams)
   - Record scores for students
   - Generate report cards with GPA

3. **Attendance Tracking**
   - Admin attendance management (staff)
   - Teacher attendance management (classes)
   - Attendance reports and summaries

4. **Dashboard Analytics**
   - Student enrollment trends
   - Staff performance metrics
   - Academic performance summaries

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| [PHASE2_SETUP.md](PHASE2_SETUP.md) | Phase 2 setup (auth, schemas, base APIs) |
| [PHASE2_INTEGRATION.md](PHASE2_INTEGRATION.md) | Phase 2 integration guide |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md) | Supabase project initialization |
| [AUTH_LOADING_FIX.md](AUTH_LOADING_FIX.md) | RLS circular recursion fix |
| [PROMPT.md](../PROMPT.md) | Full EduNexus build specification |

---

## ✨ Summary

**Phase 3 is complete and verified.**

- 6 new pages implemented (Students + Staff list/create/detail)
- Integrated with existing Phase 2 services/hooks
- Full CRUD operations working
- Error handling + loading states included
- Ready for Phase 4 (Academics)

**To proceed**: 
1. ✅ Verify Phase 3 setup (this doc)
2. ✅ Run all test scenarios
3. ✅ Confirm no console errors
4. 📝 Start Phase 4 implementation (Academics module)

---

*Last updated: March 21, 2026*  
*Next review: Phase 4 kickoff*
