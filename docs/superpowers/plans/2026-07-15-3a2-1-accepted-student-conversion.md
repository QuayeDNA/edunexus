# Plan: [3a.2.1] Accepted → Student Conversion

**Issue:** #50
**Depends on:** 3a.1.2 (accept endpoint), Layer 1 (Class/Year exist in schema)
**Branch:** `50-3a2-1-accepted-student-conversion`

## Tasks

### 1. Schema — Enrollments table

Create `enrollments` table: school_id, student_id, class_id, academic_year_id, status, enrollment_date. Export from index.

### 2. Student ID generation utility

School-configurable format: `{SCHOOL_CODE}{YYYY}{NNNN}` e.g. `AABS20260001`.
Query `MAX(student_id_number)` for the school and increment. Configurable prefix pattern stored on School config.

### 3. Refactor accept endpoint to do full conversion

`POST /api/applicants/[id]/accept` changes from "just set status" to atomic transaction:

- Validate applicant is `under_review` or `waitlisted`
- Start Drizzle transaction
- Create `Student` record (from applicant fields)
- Generate student_id_number
- Create `Enrollment` (student → class → current academic year)
- Create `Guardian` record (from applicant guardian fields)
- Create `studentGuardians` link
- Create `profile` for student (generated login credentials, role=student)
- Create `profile` for parent (if guardianEmail doesn't already have a profile, role=parent)
- Update applicant status to `accepted`
- Audit log
- Return created records

### 4. Update accept dialog UI

Show confirmation details before conversion: student name, ID number, class, guardian info.

### 5. Seed data

Add classes for demo school across grade levels.

### 6. Tests

Integration test: full conversion atomicity, ID generation, profile creation, duplicate guard.

## Acceptance Criteria

- Given an applicant is accepted, when admin confirms conversion, then a `Student`, `Enrollment`, and at least one `Guardian` link exist
- Operation is atomic (no partial state on failure)
- Student ID number is generated in school-configurable format
- Parent profile created if no existing profile with guardianEmail
