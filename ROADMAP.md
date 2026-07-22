# EduNexus — Roadmap v2

> Next.js 16 + PostgreSQL (Drizzle) + TypeScript, multi-tenant school management platform
> Strategy: **Entity-Layered backend, Role-Delivered frontend** (hybrid of your entity-based instinct and the existing role-based phase plan)
> Superseding: original "Feature-based → Role-based" roadmap (Jul 2026)

---

## 0. What changed and why

Your original plan organizes phases **by portal** (Admin → Teacher → Student → Parent). That's the right lens for _shipping visible value_, but it hides two problems:

1. **Entity rework risk.** `Attendance`, `Grade`, `Fee`, and `Announcement` are each consumed by 3–4 roles. Building them once inside "Admin Portal" and re-touching them in every later phase (new query, new permission check, new UI) means you re-open the same table/API 4 times across 4 phases instead of once.
2. **Coverage gaps.** The original roadmap has no admissions/enrollment pipeline, no promotion/graduation workflow, no ID cards/certificates, no hostel/boarding module (relevant for Ghana boarding schools), and — most importantly for your market — **no WAEC/BECE/GES compliance layer**, which is likely the single biggest differentiator against generic school SaaS in Ghana.

**This version keeps your role-based delivery cadence** (so you still ship a usable Admin Portal, then Teacher Portal, etc.) **but sequences the underlying entities in dependency order first**, and folds in every module a mature SIS (Student Information System) typically has. Each phase below is broken into **Epics → Issues → Tasks → Acceptance Criteria**, ready to paste into GitHub Issues/Projects.

---

## 1. Core Entity Dependency Graph

Build (or at least schema + API stub) entities top-to-bottom. A layer should not be started until everything it depends on (arrows) exists.

```
Layer 0 — Tenancy & Identity            [DONE — Phase 1]
  School → Subscription/Plan → User(profile) → Role

Layer 1 — Academic Structure            [DONE partial — Phase 2 seed only]
  AcademicYear → Term → GradeLevel → Class(section) → Subject → Curriculum

Layer 2 — People & Admissions            [MISSING — new Phase 3a]
  Applicant → Admission Decision → Student → Guardian (M:N link)
  Staff → EmploymentContract
  Enrollment (Student × Class × Year)

Layer 3 — Scheduling & Presence
  Timetable/Period (needs Layer 1)
  Attendance — student & staff (needs Layer 2 + Timetable)

Layer 4 — Assessment & Progression
  AssessmentType → Assessment → Score/Grade → ReportCard
  Promotion/Graduation/Transfer/Withdrawal (needs Attendance + Grades)

Layer 5 — Finance
  FeeCategory → FeeSchedule → StudentInvoice → Payment/Transaction
  PayrollRun → Payslip (needs Staff + EmploymentContract)
  ExpenseTracking

Layer 6 — Communication
  Announcement / Message / Notification / SMS-Email log

Layer 7 — Portals (UI layer consuming 0–6)
  Admin / Teacher / Student / Parent dashboards & views

Layer 8 — Extended Modules (optional, revenue-differentiating)
  Library → Loan → Fine
  Transport → Route → Manifest
  Hostel/Boarding → Room → Allocation
  Inventory → StockMovement → PurchaseOrder
  Health/Wellness → MedicalRecord → Check-in
  Behavior/Gamification → Points → Badge

Layer 9 — Ghana Compliance & Reporting
  GES reporting formats, WAEC/BECE candidate registration exports,
  SSNIT/PAYE payroll (already scoped) → statutory filing exports

Layer 10 — Platform Hardening
  Security, offline sync, performance, monitoring, docs, load testing
```

**Rule of thumb going forward:** when you start any new entity, check this graph — if a dependency isn't built, build its schema + minimal API first, even if the UI comes later.

---

## 1a. Role Coverage Matrix

Every phase below is still organized around **who it's for**, same as your original plan — the entity graph in §1 only decides _internal build order_, it doesn't replace role-based delivery. Use this table to see, at a glance, which role a phase primarily serves and which roles get secondary/read-only exposure.

| Phase                        | super_admin (Platform Operator) |    admin (School)     |         teacher          |         student         |            parent             |
| ---------------------------- | :-----------------------------: | :-------------------: | :----------------------: | :---------------------: | :---------------------------: |
| 1 — Foundation               |           ✅ primary            |           —           |            —             |            —            |               —               |
| 2 — Super Admin Portal       |           ✅ primary            |           —           |            —             |            —            |               —               |
| 3a — Admissions & Enrollment |                —                |      ✅ primary       |            —             |            —            | incidental (application form) |
| 3 — Admin Portal             |      🔧 ongoing ops (§16)       |      ✅ primary       |            —             |            —            |               —               |
| 4 — Teacher Portal           |      🔧 ongoing ops (§16)       | secondary (oversight) |        ✅ primary        |            —            |               —               |
| 5 — Student Portal           |                —                | secondary (oversight) | secondary (input source) |       ✅ primary        |               —               |
| 6 — Parent Portal            |      🔧 ongoing ops (§16)       | secondary (oversight) |            —             | secondary (data source) |          ✅ primary           |
| 7 — Communication            |      🔧 ongoing ops (§16)       |       ✅ shared       |        ✅ shared         |        ✅ shared        |           ✅ shared           |
| 8 — Design System            |            ✅ shared            |       ✅ shared       |        ✅ shared         |        ✅ shared        |           ✅ shared           |
| 9 — Ghana Compliance         |      🔧 ongoing ops (§16)       |      ✅ primary       |        secondary         |            —            |               —               |
| 10 — Production Hardening    |   ✅ primary (platform-wide)    |       secondary       |            —             |            —            |               —               |
| 11 — Extended Modules        |      🔧 ongoing ops (§16)       |      ✅ primary       |          varies          |         varies          |            varies             |

**"🔧 ongoing ops" means:** the phase itself is not for the platform operator, but it creates new things the operator needs visibility/control over (new module to meter, new cost to monitor, new tenant behavior to support). §16 lists these explicitly so they don't get silently dropped the way they were in v1, where super_admin work disappeared after Phase 2.

---

## 2. Issue Template (use for every ticket below)

```
### [PHASE-EPIC-##] Short title

**Entity layer:** L#
**Depends on:** (issue IDs or "none")
**Roles affected:** admin / teacher / student / parent / super_admin

**Description:**
One paragraph — what and why.

**Tasks:**
- [ ] Schema/migration
- [ ] API route(s) + validation
- [ ] Permission/role guard
- [ ] UI (list all screens)
- [ ] Tests (unit + at least 1 integration)
- [ ] Seed/demo data updated

**Acceptance Criteria:**
- Given/When/Then statements, testable, no ambiguity
```

---

## 3. Phase 3a — Admissions & Enrollment _(NEW — insert before old Phase 3)_

**Goal:** Get students and guardians into the system properly, instead of assuming they already exist.
**Timeline:** 1–2 weeks

### Epic 3a.1 — Applicant intake

- ~~[3a.1.1] Public application form~~ ✅ **Complete** (PR #115, merged to `preview` Jul 10)
  - **Entity layer:** L2
  - **Depends on:** none
  - **Blocker:** [#116](https://github.com/QuayeDNA/edunexus/issues/116) — Cloudinary credentials for production file storage
  - **Roles affected:** admin, parent (applicant)
  - Tasks: public form route per school subdomain; file upload for birth certificate (PR #118); application status enum; email confirmation via Resend.
  - AC: Given a valid subdomain, when a guardian submits the form, then an `Applicant` row is created with status `submitted` and a confirmation email is sent within 1 minute.

- ~~[3a.1.2+3a.1.3] Admissions review queue & enhanced data collection~~ ✅ **Complete** (commit `e44f026`, Jul 15)
  - **Entity layer:** L2
  - **Depends on:** [#48](https://github.com/QuayeDNA/edunexus/issues/48) (3a.1.1)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: list/filter applicants by status/grade level; detail view with documents; accept/reject/waitlist with capacity check against `Class` max size; enhanced form fields (guardian occupation/employer, medical info, siblings, emergency contacts, applicant photo upload).
  - AC: Given a class is at capacity, when an admin tries to accept an applicant into it, then the system warns and requires override confirmation.

- ~~[3a.1.4] Status notifications, cooldown & anonymization~~ ✅ **Complete** (commit `e44f026`, same session)
  - **Entity layer:** L2
  - **Depends on:** [#49](https://github.com/QuayeDNA/edunexus/issues/49) (3a.1.2)
  - **Blocker:** none
  - **Roles affected:** admin, parent (applicant)
  - Tasks: email notifications on status changes (4 templates: under_review, accepted, rejected, waitlisted); 6-month re-application cooldown for rejected applicants (409 on POST if within window, auto-anonymize old record if expired); data anonymization service (clears all personal fields, keeps stats); cleanup endpoint (`POST /api/applicants/cleanup`, batch-anonymizes 100 at a time).
  - AC: Given a rejected applicant re-applies within 6 months, then the POST returns 409 with cooldown expiry date. Given a rejected applicant re-applies after 6 months, then the old record is anonymized and the new application proceeds normally. Given a POST to `/api/applicants/cleanup`, then all rejected records older than 6 months are anonymized (up to 100 per call).

### Epic 3a.2 — Student & Guardian conversion

- ~~[3a.2.1] Accepted → Student conversion~~ ✅ **Complete** (PR #121, merged to `preview` Jul 15)
  - **Entity layer:** L2
  - **Depends on:** [#49](https://github.com/QuayeDNA/edunexus/issues/49) (3a.1.2)
  - **Roles affected:** admin
  - Tasks: convert `Applicant` to `Student` + `Enrollment` in one transaction; generate student ID number (school-configurable format); create or link `Guardian` record(s), support multiple guardians per student and multiple students per guardian.
  - AC: Given an applicant is accepted, when the admin confirms conversion, then a `Student`, `Enrollment`, and at least one `Guardian` link exist, and the operation is atomic (no partial state on failure).

- ~~[3a.2.2] Direct student entry (bypass admissions)~~ ✅ **Complete** (10 commits on `51-3a2-2-direct-student-entry`, Jul 15)
  - **Entity layer:** L2
  - **Depends on:** none
  - **Roles affected:** admin
  - Tasks: manual "add existing student" flow for schools onboarding mid-year; bulk CSV import with column mapping and validation report.
  - AC: Given a CSV with 200 rows where 5 have invalid data, when imported, then 195 succeed, 5 are reported with row-level error messages, and nothing partially commits per invalid row.

### Epic 3a.3 — Lifecycle events

- ~~[3a.3.1] Transfer / Withdrawal / Re-admission~~ ✅ **Complete** (PR #124, merged to `preview` Jul 16)
  - **Entity layer:** L2
  - **Depends on:** [#50](https://github.com/QuayeDNA/edunexus/issues/50) (3a.2.1)
  - **Roles affected:** admin
  - Tasks: status field on `Enrollment` (`active`, `transferred_out`, `withdrawn`, `graduated`); transfer certificate generation (PDF); re-admission flow reuses existing `Student` record.
  - AC: Given a withdrawn student, when re-admitted next year, then historical records (grades, attendance) remain linked to the same `Student` id.

- **[3a.3.2] Parent/student transfer request & admin approval workflow** ⏳ _deferred_
  - **Entity layer:** L2
  - **Depends on:** Phase 6 [#64](https://github.com/QuayeDNA/edunexus/issues/64) (Parent Portal), Phase 7 [#69](https://github.com/QuayeDNA/edunexus/issues/69) (Notification infrastructure)
  - **Blocker:** blocked by Phase 6, Phase 7
  - **Roles affected:** admin, parent
  - Tasks: parent/student submits transfer request via portal; admin approval queue; approved request triggers same backend flow as [3a.3.1]; notification sent on status change.
  - AC: Given a parent submits a transfer request, when the admin approves it, then the enrollment status updates to `transferred_out` and the parent receives a notification.
  - ⚡ **GitHub:** [#123](https://github.com/QuayeDNA/edunexus/issues/123)

---

## 4. Phase 3 — Admin (School) Portal _(restructured in entity order)_

**Goal:** School admin manages the full academic and operational lifecycle.
**Timeline:** 4–6 weeks

### Epic 3.1 — Academic structure (Layer 1)
- ~~[3.1.1] Academic Years & Terms CRUD~~ ✅ **Complete** (PR #134)
  - **Entity layer:** L1
  - **Depends on:** none (schema exists from Phase 1 seed)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for academic_years and terms tables; list/create/edit academic years; list/create/edit terms within a year; set current term; lock past terms; enforce locked-term write rejection in API layer.
  - AC: Given a term is marked `locked`, when any user attempts to edit grades/attendance in it, then the write is rejected with a clear error.
  - AC: Given a new academic year is created, when an admin sets it as current, then the previous year's terms are automatically locked.
  - ⚡ **GitHub:** [#28](https://github.com/QuayeDNA/edunexus/issues/28)
- ~~[3.1.2] Grade Levels & Classes CRUD~~ ✅ **Complete** (commit `ac32e30`, Jul 21)
  - **Entity layer:** L1
  - **Depends on:** [#28](https://github.com/QuayeDNA/edunexus/issues/28) (3.1.1)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for grade_levels and classes tables; list/create/edit grade levels (name, code, description); list/create/edit classes within a grade level; capacity management; homeroom teacher assignment with validation; composite unique on (school_id, grade_level_id, name).
  - AC: Given a class is created with capacity 30, when the enrollment count reaches 30, then further enrollment attempts are rejected with an over-capacity error.
  - AC: Given a teacher is assigned as homeroom to two classes at the same time slot, then the system warns on save but does not block (teacher may teach multiple classes).
  - ⚡ **GitHub:** [#29](https://github.com/QuayeDNA/edunexus/issues/29)
- ~~**[3.1.3] Subjects & Curriculum CRUD** — subject-to-grade-level mapping, core vs elective flag~~ ✅ Complete
  - **Entity layer:** L1
  - **Depends on:** #29 (3.1.2) ✅
  - **Roles affected:** admin
  - Tasks: schema for subjects, curriculum, and subject_grade_level tables; list/create/edit subjects with code, name, description; map subjects to grade levels with core/elective flag; curriculum grouping (e.g., "Science" curriculum includes Physics, Chemistry, Biology).
  - AC: ✅ Subject core/elective flag enforced via toggle-core endpoint
  - AC: ✅ Subject deletion blocked if referenced by classSubjects or subjectGradeLevels
  - ⚡ **GitHub:** [#30](https://github.com/QuayeDNA/edunexus/issues/30) — **PR [#136](https://github.com/QuayeDNA/edunexus/pull/136)**
- **[3.1.4] Class-Subject-Teacher assignment matrix** — bulk assign, conflict warning if teacher already booked
  - **Entity layer:** L1
  - **Depends on:** [#30](https://github.com/QuayeDNA/edunexus/issues/30) (3.1.3), [#35](https://github.com/QuayeDNA/edunexus/issues/35) (3.3.1 Staff)
  - **Blocker:** depends on Staff CRUD for teacher selection
  - **Roles affected:** admin
  - Tasks: schema for class_subject_teacher pivot table; grid/matrix UI showing subjects per class with teacher dropdowns; batch save; real-time conflict detection (teacher booked in two classes at same period — requires timetable integration in v2).
  - AC: Given a teacher is assigned to Subject A in Class 1, when the admin assigns the same teacher to Subject B in Class 2, then the system saves successfully but flags a potential conflict (soft warning, not a hard block at this stage).
  - AC: Given a batch assignment of 20 subject-teacher pairs where 2 contain invalid teacher IDs, then 18 pairs are saved and 2 are reported with specific error messages.
  - ⚡ **GitHub:** [#31](https://github.com/QuayeDNA/edunexus/issues/31)

### Epic 3.2 — Students (Layer 2, list/detail beyond admissions)

- ~~[3.2.1] Student list/detail/edit~~ ✅ **Complete** (PR #124, merged to `preview` Jul 16)
  - **Entity layer:** L2
  - **Depends on:** [#51](https://github.com/QuayeDNA/edunexus/issues/51) (3a.3.1)
  - **Roles affected:** admin
  - Tasks: list page with stats bar + filters, detail page with info/enrollments/guardians/audit log, edit profile form, lifecycle actions (withdraw/transfer/graduate/re-admit) on detail page
- **[3.2.2] Promotion & graduation workflow**
  - **Entity layer:** L4
  - **Depends on:** [#55](https://github.com/QuayeDNA/edunexus/issues/55) (4.3 Assessment), [#54](https://github.com/QuayeDNA/edunexus/issues/54) (4.2 Attendance)
  - **Blocker:** blocked by Phase 4 assessment and attendance modules
  - **Roles affected:** admin
  - Tasks: end-of-year batch promotion tool with rule preview (e.g. min attendance %, pass mark); graduation marks `Enrollment.status = graduated` and issues certificate.
  - AC: Given promotion rules are configured, when admin runs "promote all," then a preview list shows who passes/fails rules before committing, and committing is reversible for 24h via an audit-logged undo.
  - AC: Given a student fails the attendance threshold, when promotion preview is generated, then the student appears in the "fails" section with the specific reason displayed.
  - ⚡ **GitHub:** [#33](https://github.com/QuayeDNA/edunexus/issues/33)
- **[3.2.3] ID card generation**
  - **Entity layer:** L2
  - **Depends on:** [#32](https://github.com/QuayeDNA/edunexus/issues/32) (3.2.1 Student list/detail)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: PDF template with student photo, name, class, student ID; QR code linking to student record (public or admin-authenticated); batch generation per class or grade level; print layout (multiple cards per page for A4 perforated sheets).
  - AC: Given an admin selects 30 students in a class and clicks "Generate ID Cards," then a single PDF is returned with all 30 cards, 8 per page in a 2×4 grid.
  - AC: Given a student has no photo uploaded, then the ID card renders a placeholder avatar instead of breaking the layout.
  - ⚡ **GitHub:** [#34](https://github.com/QuayeDNA/edunexus/issues/34)

### Epic 3.3 — Staff

- ~~**[3.3.1] Staff list/detail/new/edit**~~ ✅ Complete (PR #137, merged to `preview` Jul 22)
  - **Entity layer:** L2
  - **Depends on:** none (standalone entity)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for staff and employment_contracts tables; list with filters (department, status, role); detail view with contract info and audit log; create/edit staff profile with employment contract (type: permanent/fixed-term/part-time, salary in GHS, start/end date); deactivate/reactivate staff.
  - AC: Given a staff member is created with a fixed-term contract ending June 30, when the date passes, then the staff status auto-changes to `inactive` and the admin receives a notification. _(deferred — requires cron/scheduler)_
  - AC: Given an admin searches for "Ama" in the staff list, then all staff with "Ama" in first name, last name, or employee ID are returned.
  - ⚡ **GitHub:** [#35](https://github.com/QuayeDNA/edunexus/issues/35)
- **[3.3.2] Leave management**
  - **Entity layer:** L2
  - **Depends on:** [#35](https://github.com/QuayeDNA/edunexus/issues/35) (3.3.1 Staff)
  - **Blocker:** none
  - **Roles affected:** admin, staff
  - Tasks: leave type configuration (annual, sick, exam, maternity/paternity); leave balance tracking per staff per year; request workflow: submit → manager approve/reject → deduct from balance; leave calendar view; GES-mandated leave entitlements as default presets.
  - AC: Given a staff member has 12 remaining annual leave days, when they request 15 days, then the system rejects the request with a balance-exceeded error.
  - AC: Given a leave request is approved, when the leave period starts, then the staff member's timetable shows them as unavailable.
  - ⚡ **GitHub:** [#36](https://github.com/QuayeDNA/edunexus/issues/36)
- **[3.3.3] Staff attendance**
  - **Entity layer:** L3
  - **Depends on:** [#35](https://github.com/QuayeDNA/edunexus/issues/35) (3.3.1 Staff)
  - **Blocker:** none (can be built independently of student attendance)
  - **Roles affected:** admin, staff
  - Tasks: check-in/check-out mechanism (admin mark or self-service kiosk); daily attendance log per staff; late/early/absent statuses; monthly summary per staff; integration with payroll (absences affect salary calculation — optional in v1).
  - AC: Given a staff member does not check in by 9:00 AM, when the admin views attendance, then they are marked as `absent` unless a leave record covers the date.
  - ⚡ **GitHub:** [#37](https://github.com/QuayeDNA/edunexus/issues/37)

### Epic 3.4 — Timetable (Layer 3)

- **[3.4.1] Timetable builder**
  - **Entity layer:** L3
  - **Depends on:** [#31](https://github.com/QuayeDNA/edunexus/issues/31) (3.1.4 Class-Subject-Teacher), [#29](https://github.com/QuayeDNA/edunexus/issues/29) (3.1.2 Classes)
  - **Blocker:** blocked by [#31](https://github.com/QuayeDNA/edunexus/issues/31) (class-subject-teacher assignments must exist first)
  - **Roles affected:** admin
  - Tasks: schema for timetable, periods, and slots; drag-drop grid UI (rows=periods, columns=days); per-class, per-teacher, and per-room views; conflict detection (teacher double-booked, room double-booked); validation before save; GES standard period durations (35/40/50 min) as presets.
  - AC: Given two classes are assigned the same teacher at the same period, then the system flags a conflict before save.
  - AC: Given a timetable slot is created for Grade 7A on Monday 8:00–8:40 AM with Teacher X, when viewing Teacher X's schedule, then the slot appears on their timetable at the same time.
  - ⚡ **GitHub:** [#38](https://github.com/QuayeDNA/edunexus/issues/38)
- **[3.4.2] Timetable PDF export**
  - **Entity layer:** L3
  - **Depends on:** [#38](https://github.com/QuayeDNA/edunexus/issues/38) (3.4.1 Timetable builder)
  - **Blocker:** none
  - **Roles affected:** admin, teacher, student, parent
  - Tasks: PDF generation per class (one week view); PDF generation per teacher (all classes); printable A4 layout with Ghana school week format (Monday–Friday); optional school logo and academic term header.
  - AC: Given a timetable exists for Grade 7A, when the admin clicks "Export PDF," then a formatted PDF is generated with all class periods, subjects, and teacher names, and downloads within 3 seconds.
  - ⚡ **GitHub:** [#39](https://github.com/QuayeDNA/edunexus/issues/39)

### Epic 3.5 — Fees & Payroll (Layer 5)

- **[3.5.1] Fee categories & schedules**
  - **Entity layer:** L5
  - **Depends on:** [#28](https://github.com/QuayeDNA/edunexus/issues/28) (3.1.1 Academic Years)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for fee_categories, fee_schedules, and fee_grade_overrides; create fee categories (tuition, boarding, transport, PTA, etc.) with optional descriptions; fee schedules linked to academic term and grade level; per-student overrides for scholarships or special arrangements; recurring vs one-time flags; amounts in GHS (numeric, not float).
  - AC: Given a fee schedule is created for Grade 7 Term 1 with tuition of 500 GHS, when invoices are auto-generated, then every active Grade 7 student receives an invoice for 500 GHS.
  - AC: Given a student has a per-student override of 300 GHS on a schedule of 500 GHS, when invoices are generated, then the student's invoice reflects 300 GHS not 500 GHS.
  - ⚡ **GitHub:** [#40](https://github.com/QuayeDNA/edunexus/issues/40)
- **[3.5.2] Auto-generation of student invoices**
  - **Entity layer:** L5
  - **Depends on:** [#40](https://github.com/QuayeDNA/edunexus/issues/40) (3.5.1 Fee categories)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for student_invoices and invoice_line_items; background job (or synchronous endpoint for MVP) to generate invoices per term; idempotency — running twice generates same invoices (no duplicates); preview mode showing what will be generated before commit; invoice status: draft, issued, paid_partial, paid_in_full, overdue, cancelled.
  - AC: Given invoice generation runs for Term 1, when run a second time, then no duplicate invoices are created and existing invoices are not modified.
  - AC: Given a student is enrolled mid-term, when invoice generation runs, then a pro-rated invoice is created for the remaining weeks.
  - ⚡ **GitHub:** [#41](https://github.com/QuayeDNA/edunexus/issues/41)
- **[3.5.3] Scholarships & discounts**
  - **Entity layer:** L5
  - **Depends on:** [#40](https://github.com/QuayeDNA/edunexus/issues/40) (3.5.1 Fee categories)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for scholarship_programs and student_discounts; percentage-based (e.g., 50% tuition) and fixed-amount (e.g., 200 GHS off transport) discount types; approval workflow: draft → pending_approval → approved/rejected; audit trail for all changes; automatic application to future invoices; effective date range.
  - AC: Given a student is approved for a 50% tuition scholarship, when the next term's invoice is generated, then the tuition line item is reduced by 50%.
  - AC: Given a scholarship expires at the end of Term 2, when Term 3 invoices are generated, then the discount is not applied.
  - ⚡ **GitHub:** [#42](https://github.com/QuayeDNA/edunexus/issues/42)
- **[3.5.4] Expense tracking**
  - **Entity layer:** L5
  - **Depends on:** none
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for expense_categories and expenses; create/edit/view expenses with category, amount, description, date, receipt upload; monthly/termly summary by category; authorization workflow for large expenses (optional).
  - AC: Given an expense is created with a receipt image, when viewing the expense, then the receipt image is displayed as a thumbnail that can be opened in full size.
  - AC: Given a month-end report is generated, then expenses are grouped by category with subtotals and a grand total in GHS.
  - ⚡ **GitHub:** [#43](https://github.com/QuayeDNA/edunexus/issues/43)
- **[3.5.5] Payroll runs**
  - **Entity layer:** L5
  - **Depends on:** [#35](https://github.com/QuayeDNA/edunexus/issues/35) (3.3.1 Staff)
  - **Blocker:** none
  - **Roles affected:** admin, super_admin
  - Tasks: schema for payroll_runs and payslips; payroll run lifecycle: draft → approve (admin) → process (super_admin); SSNIT calculation (5.5% employee / 13% employer); Ghana PAYE tax band calculation; staff attendance integration (absences → salary deduction) — optional; bank transfer file export (GCB/MTN MoMo for unbanked staff).
  - AC: Given a payroll run is in `approved` state, then employee salary fields become read-only until the run is reverted by a super_admin-level action (audit logged).
  - AC: Given a staff member's gross salary is 3,000 GHS, when the payroll run is processed, then SSNIT employee contribution of 165 GHS and employer contribution of 390 GHS are calculated and recorded.
  - ⚡ **GitHub:** [#44](https://github.com/QuayeDNA/edunexus/issues/44)
- **[3.5.6] Payslip PDF generation**
  - **Entity layer:** L5
  - **Depends on:** [#44](https://github.com/QuayeDNA/edunexus/issues/44) (3.5.5 Payroll runs)
  - **Blocker:** none
  - **Roles affected:** admin, staff
  - Tasks: PDF template with staff details, earnings, deductions, net pay, SSNIT contributions, PAYE; batch export per payroll run; individual staff access via Teacher Portal (Phase 4); Ghana-specific format with salary components in GHS.
  - AC: Given a payroll run of 50 staff is completed, when the admin clicks "Export All Payslips," then 50 individual PDFs are generated and zipped for download within 10 seconds.
  - ⚡ **GitHub:** [#45](https://github.com/QuayeDNA/edunexus/issues/45)

### Epic 3.6 — Reports hub

- **[3.6.1] Cross-entity report builder**
  - **Entity layer:** L7
  - **Depends on:** Phase 3 core entities (attendance, fees, grades, payroll)
  - **Blocker:** depends on most Phase 3 entities being built first
  - **Roles affected:** admin
  - Tasks: report template system with configurable columns and filters; pre-built report types: attendance summary by class/grade, fee arrears list, grade distribution, payroll cost center; export to CSV and PDF; date range and academic term selectors.
  - AC: Given an admin selects "Fee Arrears" with Grade 7 filter, when the report is generated, then all Grade 7 students with outstanding balances are listed, sorted by amount descending, with parent contact info.
  - ⚡ **GitHub:** [#46](https://github.com/QuayeDNA/edunexus/issues/46)
- **[3.6.2] Scheduled/exportable reports**
  - **Entity layer:** L7
  - **Depends on:** [#46](https://github.com/QuayeDNA/edunexus/issues/46) (3.6.1 Report builder)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: cron-based report scheduling (daily, weekly, monthly, termly); email delivery to configurable recipients; supported formats: CSV, PDF; delivery log with success/failure status.
  - AC: Given a fee arrears report is scheduled for the 1st of every month, when the 1st arrives, then the report is generated and emailed to the configured recipients within 1 hour of midnight.
  - ⚡ **GitHub:** [#47](https://github.com/QuayeDNA/edunexus/issues/47)

### Epic 3.7 — School Setup Wizard _(admin first-run experience)_

_New epic — replaces the current bare school creation flow with a guided setup wizard._

**Goal:** School admin's first login triggers a setup wizard that collects expanded school data before they can access the admin dashboard. Super admin's job is reduced to creating the minimal school + admin account (2 fields).

- **[3.7.1] Minimal school + admin creation (super admin)** ⏳ _deferred — not in current sprint_
  - **Entity layer:** L0
  - **Depends on:** Phase 2 super admin auth
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Description: Replace current school creation form (10+ fields) with a minimal form: school name + admin email/name. System creates schools row (name, auto-slug, status: setup_pending) + profiles row (admin role, temp password) + sends welcome email. One atomic transaction.
  - Tasks: new `POST /api/super-admin/onboard` endpoint; atomically create school + user + audit logs; auto-generate slug; send welcome email; add `setup_pending` school status; redirect to wizard on first admin login.
  - AC: Given a super admin enters "Accra Academy" and "ama@example.com", when submitted, then a school with auto-slug "accra-academy" and an admin user with temp password are created, and a welcome email is sent within 1 minute.
  - AC: Given an admin logs in for the first time with `setup_pending` status, then they see the setup wizard, not the dashboard.
  - ⚡ **GitHub:** [#128](https://github.com/QuayeDNA/edunexus/issues/128)

- **[3.7.2] School setup wizard (admin first-run)** ⏳ _deferred_
  - **Entity layer:** L2
  - **Depends on:** [#128](https://github.com/QuayeDNA/edunexus/issues/128) (3.7.1)
  - **Blocker:** blocked by [#128](https://github.com/QuayeDNA/edunexus/issues/128)
  - **Roles affected:** admin
  - Description: Guided 7-step wizard that collects expanded school data. Steps: Profile, Contact, Academic Config, Branding, Grade Levels, Academic Year, Review & Complete. On completion, school status changes from `setup_pending` to `active`, dashboard unlocks.
  - Tasks: wizard UI with progress indicator per step; expanded data collection (motto, established year, type, GES reg number, GPS address, curriculum, calendar, logo, colors, grade level checkboxes, term dates); validation per step; submission updates schools.config jsonb + creates grade levels + academic year + terms; status transition to active.
  - AC: Given an admin completes all 7 wizard steps and clicks "Complete Setup," then the school profile is populated with all collected data, grade levels and academic year are created, and the admin is redirected to the dashboard.
  - AC: Given an admin closes the browser mid-wizard, when they log back in, then they resume at the last completed step (progress is saved per-step).
  - ⚡ **GitHub:** [#129](https://github.com/QuayeDNA/edunexus/issues/129)

---

## 5. Phase 4 — Teacher Portal

**Timeline:** 3–4 weeks
**Depends on:** Layer 3 (Timetable, Attendance), Layer 4 (Assessment)

- **[4.1] Teacher dashboard**
  - **Entity layer:** L7
  - **Depends on:** [#38](https://github.com/QuayeDNA/edunexus/issues/38) (3.4.1 Timetable), [#54](https://github.com/QuayeDNA/edunexus/issues/54) (4.2 Attendance), [#55](https://github.com/QuayeDNA/edunexus/issues/55) (4.3 Assessment)
  - **Blocker:** none
  - **Roles affected:** teacher
  - Tasks: today's class schedule widget from timetable data; pending assessments needing grading; unread message count; quick-mark attendance link for current class; recent behavior log entries.
  - AC: Given a teacher logs in at 8:00 AM on Monday, when the dashboard loads, then it shows their first class of the day (if any) with a "Mark Attendance" button.
  - ⚡ **GitHub:** [#53](https://github.com/QuayeDNA/edunexus/issues/53)
- **[4.2] Attendance marking**
  - **Entity layer:** L3
  - **Depends on:** [#38](https://github.com/QuayeDNA/edunexus/issues/38) (3.4.1 Timetable), [#29](https://github.com/QuayeDNA/edunexus/issues/29) (3.1.2 Classes)
  - **Blocker:** none
  - **Roles affected:** teacher
  - Tasks: class attendance grid (students × status: present, absent, late, excused); date picker (default: today); bulk set status for all students; edit-within-window rule (48h default); reason required for late edits; audit log on every change; attendance statistics per class (daily %, term trend).
  - AC: Given attendance was marked >48h ago, when a teacher tries to edit it, then they must provide a reason, and the edit is logged in `audit_logs`.
  - AC: Given a class has 30 students, when the teacher sets 28 to "Present" and 2 to "Absent" and saves, then the attendance summary shows 93.3% for that date.
  - ⚡ **GitHub:** [#54](https://github.com/QuayeDNA/edunexus/issues/54)
- **[4.3] Assessment & grade entry**
  - **Entity layer:** L4
  - **Depends on:** [#30](https://github.com/QuayeDNA/edunexus/issues/30) (3.1.3 Subjects), [#31](https://github.com/QuayeDNA/edunexus/issues/31) (3.1.4 Assignments)
  - **Blocker:** none
  - **Roles affected:** teacher
  - Tasks: schema for assessments, assessment_types, scores, and gradebook; create assessment linked to class-subject-teacher; score entry grid (students × score fields); weighted average calculation per assessment type (e.g., exam 50%, classwork 20%, homework 15%, project 15%); grade distribution chart (histogram); GPA calculation per term; comment field per student.
  - AC: Given an assessment has a max score of 100, when a teacher enters a score of 110, then the field shows a validation error and does not save.
  - AC: Given all assessments for a term are scored, when the teacher views "Class Average," then it shows the mean across all students with weights applied.
  - ⚡ **GitHub:** [#55](https://github.com/QuayeDNA/edunexus/issues/55)
- **[4.4] Report card generation (teacher-triggered draft)**
  - **Entity layer:** L4
  - **Depends on:** [#55](https://github.com/QuayeDNA/edunexus/issues/55) (4.3 Assessment), [#54](https://github.com/QuayeDNA/edunexus/issues/54) (4.2 Attendance), [#56](https://github.com/QuayeDNA/edunexus/issues/56) — needs to reference these data sources
  - **Blocker:** none
  - **Roles affected:** teacher, admin
  - Tasks: draft report card generation per student per term; Ghana-format template (subjects, scores, grades, class average, teacher comment, headteacher comment); teacher triggers draft → admin finalizes/locks; PDF download; comments field per subject and general remarks.
  - AC: Given a teacher generates draft report cards for Grade 7A, when the admin reviews them, then they see all subjects, scores, grades, attendance, and teacher comments in a printable format.
  - AC: Given a report card is finalized by the admin, when the teacher attempts to edit scores, then the system rejects the edit with "Report card finalized by admin."
  - ⚡ **GitHub:** [#56](https://github.com/QuayeDNA/edunexus/issues/56)
- **[4.5] Lesson plans**
  - **Entity layer:** L1
  - **Depends on:** [#30](https://github.com/QuayeDNA/edunexus/issues/30) (3.1.3 Subjects), [#31](https://github.com/QuayeDNA/edunexus/issues/31) (3.1.4 Assignments)
  - **Blocker:** none
  - **Roles affected:** teacher
  - Tasks: schema for lesson_plans; create/edit lesson plan with date, duration, topic, objectives, materials, activities, assessment method; optional curriculum-linked template; publish/archive status; admin review queue (optional); GES lesson note format as default template.
  - AC: Given a teacher creates a lesson plan for Monday 8:00 AM Mathematics, when the timetable is viewed, then the lesson plan link appears in the timetable cell.
  - ⚡ **GitHub:** [#57](https://github.com/QuayeDNA/edunexus/issues/57)
- **[4.6] Behavior/incident logging**
  - **Entity layer:** L8
  - **Depends on:** [#32](https://github.com/QuayeDNA/edunexus/issues/32) (3.2.1 Student list)
  - **Blocker:** none
  - **Roles affected:** teacher, admin
  - Tasks: schema for behavior_logs; quick-log positive behavior (e.g., "Helped classmate," "Excellent participation") and negative behavior (e.g., "Disruptive," "Late to class"); type and severity fields; linked to student; admin notification for severe incidents; feeds into gamification module ([11.5]) later.
  - AC: Given a teacher logs a negative behavior incident for a student, when the admin views that student's profile, then the incident appears in the behavior history section within 1 minute.
  - ⚡ **GitHub:** [#58](https://github.com/QuayeDNA/edunexus/issues/58)

---

## 6. Phase 5 — Student Portal

**Timeline:** 2–3 weeks

- **[5.1] Student dashboard**
  - **Entity layer:** L7
  - **Depends on:** Phase 4 core endpoints (grades, attendance, fees)
  - **Blocker:** none (consumes API, can be built once APIs exist)
  - **Roles affected:** student
  - Tasks: current term snapshot widget showing grades trend (last 3 assessments), attendance percentage for current term, fee balance (outstanding/total); quick links to timetable, grade history, and attendance views; recent announcements feed.
  - AC: Given a student has 85% attendance, 3.2 GPA, and 200 GHS outstanding fees, when the dashboard loads, then all three values are displayed with color indicators (green/yellow/red based on thresholds).
  - ⚡ **GitHub:** [#59](https://github.com/QuayeDNA/edunexus/issues/59)
- **[5.2] Timetable view**
  - **Entity layer:** L7
  - **Depends on:** [#38](https://github.com/QuayeDNA/edunexus/issues/38) (3.4.1 Timetable)
  - **Blocker:** none
  - **Roles affected:** student
  - Tasks: read-only timetable for student's enrolled class; week view (Monday–Friday); subjects, teacher names, room numbers, time periods displayed; current period highlighted; today's date indicator.
  - AC: Given a student is enrolled in Grade 7A, when they view the timetable, then only Grade 7A's schedule is displayed and no other class data is accessible.
  - ⚡ **GitHub:** [#60](https://github.com/QuayeDNA/edunexus/issues/60)
- **[5.3] Grade history + report card PDF download**
  - **Entity layer:** L7
  - **Depends on:** [#55](https://github.com/QuayeDNA/edunexus/issues/55) (4.3 Assessment), [#56](https://github.com/QuayeDNA/edunexus/issues/56) (4.4 Report cards)
  - **Blocker:** none
  - **Roles affected:** student
  - Tasks: grade history view showing all assessments with scores and class average comparison; term GPA display; subject-wise grade breakdown; report card PDF download (read-only, finalized by admin); grade trend chart across terms.
  - AC: Given a student has completed 3 terms, when they view grade history, then they see a line chart showing GPA trend across all 3 terms and a table of all assessments per term.
  - ⚡ **GitHub:** [#61](https://github.com/QuayeDNA/edunexus/issues/61)
- **[5.4] Attendance record view**
  - **Entity layer:** L7
  - **Depends on:** [#54](https://github.com/QuayeDNA/edunexus/issues/54) (4.2 Attendance)
  - **Blocker:** none
  - **Roles affected:** student
  - Tasks: attendance calendar view (green=present, red=absent, yellow=late, grey=excused); monthly and term summaries; percentage breakdown by status; absence detail with reasons where available.
  - AC: Given a student was absent on 3 days in a 30-day term, when they view attendance, then the calendar shows 3 red dates and the summary shows 90% attendance.
  - ⚡ **GitHub:** [#62](https://github.com/QuayeDNA/edunexus/issues/62)
- **[5.5] Fee statement view**
  - **Entity layer:** L7
  - **Depends on:** [#41](https://github.com/QuayeDNA/edunexus/issues/41) (3.5.2 Invoices), [#66](https://github.com/QuayeDNA/edunexus/issues/66) (6.3 Payments)
  - **Blocker:** none
  - **Roles affected:** student (read-only for minors; full self-service for adult/tertiary — config option)
  - Tasks: read-only fee statement showing invoices by term; payment history with dates, amounts, and payment channels; outstanding balance; payment happens in Parent Portal for minors.
  - AC: Given a student has an invoice of 500 GHS and a payment of 300 GHS, when they view the fee statement, then it shows "Outstanding: 200 GHS" with both transaction records.
  - ⚡ **GitHub:** [#63](https://github.com/QuayeDNA/edunexus/issues/63)

---

## 7. Phase 6 — Parent Portal

**Timeline:** 3–4 weeks
**Depends on:** Layer 5 (Finance), Guardian-Student link (3a.2.1)

- **[6.1] Multi-child dashboard**
  - **Entity layer:** L7
  - **Depends on:** Phase 3a guardian-student links, Phase 4 student data endpoints
  - **Blocker:** none
  - **Roles affected:** parent
  - Tasks: child selector (switch between linked students); per-child snapshot: attendance %, latest grades, fee balance, recent behavior notes; alert badges for low attendance, fee overdue, new report card; dashboard cards for each child.
  - AC: Given a parent has 3 children enrolled, when they log in, then they see a dashboard with 3 cards, each showing the child's name, class, attendance %, and fee status.
  - ⚡ **GitHub:** [#64](https://github.com/QuayeDNA/edunexus/issues/64)
- **[6.2] Child detail views**
  - **Entity layer:** L7
  - **Depends on:** [#64](https://github.com/QuayeDNA/edunexus/issues/64) (6.1 Dashboard)
  - **Blocker:** none
  - **Roles affected:** parent
  - Tasks: reuse/shadow Student Portal components with guardian-scoped data access; attendance view, grade view, timetable view, fee statement view — all read-only; guardian-specific view of behavior reports; no edit capability.
  - AC: Given a parent views their child's attendance, then the data shown is identical to what the student sees, and no edit/save controls are present.
  - ⚡ **GitHub:** [#65](https://github.com/QuayeDNA/edunexus/issues/65)
- **[6.3] Online fee payment**
  - **Entity layer:** L5
  - **Depends on:** [#41](https://github.com/QuayeDNA/edunexus/issues/41) (3.5.2 Invoices), Paystack integration
  - **Blocker:** none
  - **Roles affected:** parent
  - Tasks: Paystack payment integration (card + Mobile Money channels); invoice selection for partial or full payment; receipt generation after successful payment; idempotency key on transaction reference to prevent duplicate processing; webhook handler for payment status updates; payment confirmation email/SMS.
  - AC: Given a payment webhook is received twice for the same reference, then only one `Payment` record is created (idempotency key on transaction reference).
  - AC: Given a parent pays 200 GHS toward a 500 GHS invoice, then the invoice status changes to `paid_partial` and the remaining balance is 300 GHS.
  - ⚡ **GitHub:** [#66](https://github.com/QuayeDNA/edunexus/issues/66)
- **[6.4] Payment history**
  - **Entity layer:** L5
  - **Depends on:** [#66](https://github.com/QuayeDNA/edunexus/issues/66) (6.3 Payments)
  - **Blocker:** none
  - **Roles affected:** parent
  - Tasks: list of all payments made across all children; filter by child, date range, status; columns: date, child name, invoice #, amount, payment channel (card/MoMo), status, receipt download; export to CSV.
  - AC: Given a parent has made 15 payments across 2 children, when they filter by "Last 30 days," then only payments within that range are shown with a total sum at the top.
  - ⚡ **GitHub:** [#67](https://github.com/QuayeDNA/edunexus/issues/67)
- **[6.5] Announcements feed**
  - **Entity layer:** L7
  - **Depends on:** [#70](https://github.com/QuayeDNA/edunexus/issues/70) (7.2 Announcements)
  - **Blocker:** blocked by Phase 7 announcements infrastructure
  - **Roles affected:** parent
  - Tasks: read-only announcements feed showing school-level announcements relevant to the parent's children; chronological list with read/unread status; announcement categories (general, class-specific, urgent); can stub as a placeholder in Phase 6 and wire to real data in Phase 7.
  - AC: Given a school admin publishes an urgent announcement, when a parent views the feed, then the announcement appears at the top with an "Urgent" badge within 1 minute.
  - ⚡ **GitHub:** [#68](https://github.com/QuayeDNA/edunexus/issues/68)

---

## 8. Phase 7 — Cross-Role Communication

**Rationale for reordering:** Parent Portal (Phase 6) references announcements and payment notifications; building comms after Phase 6 means Phase 6 ships with dead stubs. Build the entity layer here, expose it progressively.

**Timeline:** 3–4 weeks

- **[7.1] Notification infrastructure**
  - **Entity layer:** L6
  - **Depends on:** none (foundational layer; can be built standalone)
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: schema for notification_preferences and notifications; in-app notification system (WebSocket with SSE/polling fallback); per-user preference management (which channels for which event types); read/unread tracking; Mark-all-as-read; notification center UI component reusable across all portals; delivery status tracking.
  - AC: Given a user enables email notifications for fee reminders but disables SMS, when a fee reminder is triggered, then the user receives an email notification and does not receive an SMS.
  - AC: Given a notification is created, when the recipient is offline, then the notification is delivered on next page load (polling) or WebSocket reconnect.
  - ⚡ **GitHub:** [#69](https://github.com/QuayeDNA/edunexus/issues/69)
- **[7.2] Announcements**
  - **Entity layer:** L6
  - **Depends on:** [#69](https://github.com/QuayeDNA/edunexus/issues/69) (7.1 Notifications)
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: schema for announcements; create/edit announcement with title, body, attachments; targeting by role (admin, teacher, student, parent), by class, or entire school; scheduled publish (draft → publish at datetime); announcement categories (general, academic, urgent, event); read tracking per user.
  - AC: Given an announcement is targeted at Grade 7 parents, when a parent of a Grade 7 student views announcements, then they see the announcement; a Grade 8 parent does not.
  - AC: Given an announcement is scheduled for 2026-09-01 08:00, when viewed before that date, then the announcement shows as "Scheduled" and is not visible to non-admin users.
  - ⚡ **GitHub:** [#70](https://github.com/QuayeDNA/edunexus/issues/70)
- **[7.3] Internal messaging**
  - **Entity layer:** L6
  - **Depends on:** [#69](https://github.com/QuayeDNA/edunexus/issues/69) (7.1 Notifications)
  - **Blocker:** none
  - **Roles affected:** admin, teacher, parent
  - Tasks: schema for conversations and messages; compose new message (recipient picker filtered by role relationship); threaded conversation view; inbox with read/unread status; attachments; send notification to recipient via preferred channel; teacher↔parent, admin↔staff, admin↔teacher conversation types.
  - AC: Given a teacher sends a message to a parent, when the parent logs in, then the message appears in their inbox with the teacher's name and a preview of the first 100 characters.
  - AC: Given a user has 5 unread messages, when they click "Inbox," then unread messages are shown first, sorted by most recent.
  - ⚡ **GitHub:** [#71](https://github.com/QuayeDNA/edunexus/issues/71)
- **[7.4] SMS via Africa's Talking**
  - **Entity layer:** L6
  - **Depends on:** [#69](https://github.com/QuayeDNA/edunexus/issues/69) (7.1 Notifications)
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: Africa's Talking SMS provider integration; templated SMS messages (fee reminder: "Dear parent, {{fee_amount}} GHS is due by {{due_date}}. Pay via Parent Portal."; attendance alert, report card ready, admission status); sender ID configuration; delivery status callback handling; per-tenant SMS balance tracking.
  - AC: Given an SMS is sent via Africa's Talking, when delivery fails, then the notification status is updated to `failed` and the send is retried up to 3 times at 5-minute intervals.
  - ⚡ **GitHub:** [#72](https://github.com/QuayeDNA/edunexus/issues/72)
- **[7.5] Email via Resend**
  - **Entity layer:** L6
  - **Depends on:** [#69](https://github.com/QuayeDNA/edunexus/issues/69) (7.1 Notifications)
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: Resend email provider integration (already partially set up in Phase 2); shared template system overlapping with SMS content (same message sent via both channels); HTML email templates with school branding; delivery tracking via Resend webhooks; per-tenant sending quota enforcement.
  - AC: Given a notification is configured for both SMS and email, when triggered, then both an SMS (via Africa's Talking) and an email (via Resend) are sent with consistent content.
  - ⚡ **GitHub:** [#73](https://github.com/QuayeDNA/edunexus/issues/73)
- **[7.6] Delivery log & retry**
  - **Entity layer:** L6
  - **Depends on:** [#72](https://github.com/QuayeDNA/edunexus/issues/72) (7.4 SMS), [#73](https://github.com/QuayeDNA/edunexus/issues/73) (7.5 Email)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: schema for delivery_logs; unified log of all SMS and email sends with status (sent, delivered, failed, bounced); per-message detail view (recipient, channel, timestamp, error reason, retry count); manual retry button for failed messages; date range filter; cost tracking (SMS cost per message).
  - AC: Given an SMS delivery fails, when the admin views delivery logs, then the failed message appears with "Failed" status, error reason, and a "Retry" button.
  - AC: Given an admin clicks "Retry" on a failed SMS, then the SMS is resent and the log is updated with a new entry showing the retry attempt.
  - ⚡ **GitHub:** [#74](https://github.com/QuayeDNA/edunexus/issues/74)

---

## 9. Phase 8 — Design System & Polish

**Timeline:** 2–3 weeks (unchanged from original, sequenced after portals exist so polish has real screens to apply to)

- **[8.1] Design tokens**
  - **Entity layer:** L7
  - **Depends on:** none (global design system, can start anytime)
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: finalize color palette (primary, secondary, accent, semantic colors); typography scale (headings, body, caption); spacing scale (4px base grid); shadow/elevation system; border radius scale; document as CSS custom properties and Tailwind config extensions; audit existing usage for consistency.
  - AC: Given a new page is created, when the developer uses `text-lg`, then it maps to a pre-defined typography token (16px/1.5) and not an arbitrary value.
  - ⚡ **GitHub:** [#75](https://github.com/QuayeDNA/edunexus/issues/75)
- **[8.2] Animation system**
  - **Entity layer:** L7
  - **Depends on:** none
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: page transition animations (route change); micro-interactions (hover states, button press, card lift); skeleton loading animations; notification toast enter/exit animations; modal/fade transitions; consistent timing (150ms default, 300ms for large transitions).
  - AC: Given a user navigates between pages, when the route changes, then a fade transition plays (not a hard flash) and completes within 300ms.
  - ⚡ **GitHub:** [#76](https://github.com/QuayeDNA/edunexus/issues/76)
- **[8.3] Responsive audit**
  - **Entity layer:** L7
  - **Depends on:** Phases 3–7 UIs must exist first
  - **Blocker:** blocked by Phase 3–7 implementation (needs actual screens to audit)
  - **Roles affected:** all
  - Tasks: mobile (320–480px) and tablet (768–1024px) layout audit across all portals; fix overflow, cramped layouts, hidden CTAs; test sidebar/collapse behavior; data table horizontal scroll on mobile; touch target sizing (min 44×44px); document breakpoint usage.
  - AC: Given a parent views the payment history on a 375px-wide phone, then all columns are readable (either via responsive stacking or horizontal scroll) and the "Pay" button is tappable.
  - ⚡ **GitHub:** [#77](https://github.com/QuayeDNA/edunexus/issues/77)
- **[8.4] Accessibility audit**
  - **Entity layer:** L7
  - **Depends on:** Phases 3–7 UIs must exist first
  - **Blocker:** blocked by Phase 3–7 implementation
  - **Roles affected:** all
  - Tasks: WCAG AA compliance audit across all portals; keyboard navigation (all interactive elements reachable and operable via keyboard alone); screen reader labels (aria-labels, aria-describedby, role attributes); focus indicators (visible focus ring on all interactive elements); color contrast validation (4.5:1 for normal text, 3:1 for large text); form error announcements.
  - AC: Given a user navigates the admin portal using only a keyboard (Tab, Enter, Escape, Arrow keys), then all features are accessible and no interactive element is unreachable.
  - ⚡ **GitHub:** [#78](https://github.com/QuayeDNA/edunexus/issues/78)
- **[8.5] Empty/loading/error states**
  - **Entity layer:** L7
  - **Depends on:** Phases 3–7 UIs must exist first
  - **Blocker:** blocked by Phase 3–7 implementation
  - **Roles affected:** all
  - Tasks: audit all pages for empty state coverage; standardized empty state component (icon + heading + description + CTA); loading skeleton components for list/detail/table views; error state with retry button and error message; offline indicator component for Dexie sync ([10.4]).
  - AC: Given a class has no students enrolled, when the admin views the class detail, then they see an empty state with "No students enrolled in this class" and a "Add Student" button.
  - ⚡ **GitHub:** [#79](https://github.com/QuayeDNA/edunexus/issues/79)

---

## 10. Phase 9 — Ghana Compliance & Reporting

**Goal:** This is likely your strongest market differentiator — most generic school SaaS doesn't handle this.
**Timeline:** 2–3 weeks

- **[9.1] GES-format reporting exports**
  - **Entity layer:** L9
  - **Depends on:** L2 student/class data, L2 staff data
  - **Blocker:** none (consumes existing data — build once foundational entities exist)
  - **Roles affected:** admin
  - Tasks: enrollment census export in GES-required format (school name, enrollment by class by gender, age distribution); staff establishment returns (staff count by qualification, role, gender); CSV/PDF matching GES template layout; field mapping between system entities and GES column headers.
  - AC: Given a school has 200 students enrolled across 5 grade levels, when the admin generates the GES enrollment census, then the export contains exactly the columns and format specified by GES's latest circular, and can be directly submitted.
  - ⚡ **GitHub:** [#80](https://github.com/QuayeDNA/edunexus/issues/80)
- **[9.2] BECE/WASSCE candidate registration export**
  - **Entity layer:** L9
  - **Depends on:** L2 student data, L1 subjects, L4 grades/assessments
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: data format matching WAEC's expected candidate upload structure; field validation (index number format validation, subject combination rules — e.g., a student cannot take both Core Maths and Elective Maths without approval); export file generation (CSV per WAEC spec); candidate photo inclusion; fee payment status tracking.
  - AC: Given a candidate's index number is entered in wrong format, when validation runs, then the error "Invalid index number format. Expected: 0123456789" is shown with the specific row reference.
  - AC: Given 50 candidates for WASSCE, when the export is generated, then the CSV matches WAEC's column specification and passes WAEC's upload validation (documented column headers, allowed values, required fields).
  - ⚡ **GitHub:** [#81](https://github.com/QuayeDNA/edunexus/issues/81)
- **[9.3] Report card format compliance**
  - **Entity layer:** L9
  - **Depends on:** [#56](https://github.com/QuayeDNA/edunexus/issues/56) (4.4 Report cards)
  - **Blocker:** none
  - **Roles affected:** admin, teacher
  - Tasks: audit existing report card template against GES-approved formats for basic education (BECE level) and SHS (WASSCE level); GES-required sections: student info, subjects with scores/grades, class average, rank, teacher comments, headteacher signature, school stamp; format variations for different grade levels; GES grading scale implementation (A–F with numerical equivalents).
  - AC: Given a report card is generated for a JHS 3 student, when compared to the GES-approved template, then all required sections are present in the correct order, including the continuous assessment vs exam score breakdown.
  - ⚡ **GitHub:** [#82](https://github.com/QuayeDNA/edunexus/issues/82)
- **[9.4] SSNIT/PAYE statutory export**
  - **Entity layer:** L9
  - **Depends on:** [#44](https://github.com/QuayeDNA/edunexus/issues/44) (3.5.5 Payroll)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: monthly SSNIT contribution report (Tier 1 & 2, both employee 5.5% and employer 13%); Ghana PAYE tax calculation and remittance schedule; GRA-format export for annual tax filing; CSV file matching SSNIT electronic submission format; employee SSNIT number validation.
  - AC: Given a payroll run of 30 staff is approved, when the SSNIT export is generated, then each employee row shows gross salary, SSNIT employee contribution (5.5%), and SSNIT employer contribution (13%) in the format required by SSNIT's electronic submission portal.
  - ⚡ **GitHub:** [#83](https://github.com/QuayeDNA/edunexus/issues/83)
- **[9.5] Academic calendar alignment**
  - **Entity layer:** L9
  - **Depends on:** [#28](https://github.com/QuayeDNA/edunexus/issues/28) (3.1.1 Academic Years)
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: GES-preset academic calendar templates (pre-tertiary 3-term structure with standard term dates); auto-population of term dates when admin selects a GES preset; configurable per-school adjustments (some schools start a week earlier/later); holiday/break period presets.
  - AC: Given an admin is creating a new academic year and selects "GES Pre-Tertiary 2026-2027" preset, then the system auto-populates 3 terms with the standard GES start/end dates for that academic year, with the option to adjust dates before saving.
  - ⚡ **GitHub:** [#84](https://github.com/QuayeDNA/edunexus/issues/84)

---

## 11. Phase 10 — Production Hardening

**Timeline:** 3–4 weeks (unchanged from original, renumbered)

- **[10.1] Sentry error monitoring**
  - **Entity layer:** L10
  - **Depends on:** none (infrastructure, can be set up anytime)
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: install and configure Sentry SDK for Next.js; error grouping and alert thresholds; source maps upload; performance tracing for API routes and page loads; user context tagging (school_id, role) for debugging; Slack/webhook integration for critical errors.
  - AC: Given an unhandled exception occurs in an API route, when Sentry captures it, then the error is tagged with school_id, user_id, and role, and a notification is sent to the configured alert channel within 5 minutes.
  - ⚡ **GitHub:** [#85](https://github.com/QuayeDNA/edunexus/issues/85)
- **[10.2] Rate limiting + security headers**
  - **Entity layer:** L10
  - **Depends on:** none
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Tasks: rate limiting middleware (e.g., 100 req/min per IP for API routes, 10 req/min for auth endpoints); security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options); 2FA via authenticator app (TOTP) for admin and super_admin roles; 2FA setup/enforce/recovery flow; session timeout configuration.
  - AC: Given an IP makes 110 requests to the API within 1 minute, when the 101st request arrives, then it receives a 429 Too Many Requests response with a Retry-After header.
  - AC: Given a super_admin has not set up 2FA, when they log in, then they are prompted to set up 2FA before accessing any routes.
  - ⚡ **GitHub:** [#86](https://github.com/QuayeDNA/edunexus/issues/86)
- **[10.3] Automated PostgreSQL backups**
  - **Entity layer:** L10
  - **Depends on:** none
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: automated pg_dump scheduled via cron (daily full, hourly WAL archiving); backup retention policy (30 daily, 12 monthly); restore procedure documented and tested in staging; encrypted backup storage (S3-compatible); backup integrity verification.
  - AC: Given a production database failure, when the restore procedure is followed, then the database is restored to the latest available backup with < 1 hour of data loss, verified by a documented restore drill.
  - ⚡ **GitHub:** [#87](https://github.com/QuayeDNA/edunexus/issues/87)
- **[10.4] PWA + Dexie offline sync**
  - **Entity layer:** L10
  - **Depends on:** app must be functional online first
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: service worker for PWA (install prompt, offline page); Dexie.js indexedDB wrapper for client-side cache; sync strategy: critical data (timetable, grades, attendance) cached with `syncStatus: 'pending' | 'synced' | 'error'`; conflict resolution strategy documented (last-write-wins for grades, merge for attendance); background sync on reconnect.
  - AC: Given a teacher marks attendance offline, when connectivity is restored, then the attendance records are synced to the server within 30 seconds without data loss.
  - ⚡ **GitHub:** [#88](https://github.com/QuayeDNA/edunexus/issues/88)
- **[10.5] Performance optimization**
  - **Entity layer:** L10
  - **Depends on:** none (can audit at any stage)
  - **Blocker:** none
  - **Roles affected:** all
  - Tasks: React Compiler adoption (Next.js 16); next/image optimization (WebP, lazy loading, responsive sizes); Redis caching for frequent queries (timetable, school config); DB indexing pass on all tables (composite indexes on (school_id, ...) for tenant-scoped queries, covering indexes for frequent list queries); bundle analysis and code splitting; API response pagination audit.
  - AC: Given the student list endpoint serves 500 students, when requested, then the response time is < 200ms (indexed query) and the payload is paginated at 50 per page by default.
  - ⚡ **GitHub:** [#89](https://github.com/QuayeDNA/edunexus/issues/89)
- **[10.6] Documentation**
  - **Entity layer:** L10
  - **Depends on:** core features must be stable
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Tasks: admin manual (how to set up school, manage students, run payroll — screenshots and step-by-step); deploy guide (environment variables, infra setup, CI/CD); API reference (auto-generated from route schemas, OpenAPI/Swagger); on-call runbook (how to diagnose common issues, restore from backup).
  - AC: Given a new school admin is setting up their school, when they follow the admin manual, then they can complete the setup (create classes, add students, set up fees) without requiring developer assistance.
  - ⚡ **GitHub:** [#90](https://github.com/QuayeDNA/edunexus/issues/90)
- **[10.7] Load testing (k6)**
  - **Entity layer:** L10
  - **Depends on:** core API routes must exist
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: k6 test scripts simulating peak load scenarios: report card release day (concurrent report card downloads), fee due date (concurrent payment gateway calls), timetable viewing (all students view timetable at 8 AM Monday); target response times under load; identify and fix bottlenecks; document scaling limits.
  - AC: Given 500 concurrent users are simulating report card downloads, when the k6 test runs, then 95% of requests complete within 2 seconds and no request times out.
  - ⚡ **GitHub:** [#91](https://github.com/QuayeDNA/edunexus/issues/91)
- **[10.8] `docker compose up` dev environment**
  - **Entity layer:** L10
  - **Depends on:** none
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: Docker Compose configuration for PostgreSQL 17, Redis 7, MinIO (S3-compatible storage), Mailpit (email catch-all); startup script that runs migrations and seeds; documented `.env.example` with all required variables; VS Code DevContainer config (optional).
  - AC: Given a developer clones the repository, when they run `docker compose up && pnpm dev`, then all infrastructure services are running (confirmed by health checks) and the app is accessible at http://localhost:3000 with seeded demo data.
  - ⚡ **GitHub:** [#92](https://github.com/QuayeDNA/edunexus/issues/92)

---

## 12. Phase 11 — Extended & Differentiating Modules

**Timeline:** Ongoing, prioritize by customer demand post-launch

- **[11.1] Library**
  - **Entity layer:** L8
  - **Depends on:** L2 student and staff entities
  - **Blocker:** none
  - **Roles affected:** admin, student, staff
  - Tasks: catalog management (books, ISBN, author, publisher, quantity); barcode scanner support for check-in/check-out; loan management (issue, return, renew); fine calculation (configurable per-day rate); search and reservation system; overdue notifications.
  - AC: Given a student borrows a book, when the librarian scans the barcode, then the loan is recorded with the due date (14 days from issue) and the book's available quantity decrements.
  - ⚡ **GitHub:** [#93](https://github.com/QuayeDNA/edunexus/issues/93)
- **[11.2] Transport**
  - **Entity layer:** L8
  - **Depends on:** L2 student entities
  - **Blocker:** none
  - **Roles affected:** admin, parent
  - Tasks: fleet management (vehicle registration, capacity, driver assignment); route and stop configuration; student route assignment; attendance/boarding check-in per stop; GPS tracking integration; parent live-view of bus location on map (via GPS device API); manifest generation per route.
  - AC: Given a parent opens the transport tracking feature, when their child's bus is within 2 km of the pickup stop, then a push notification "Bus arriving in 5 minutes" is sent and a map shows the live bus location.
  - ⚡ **GitHub:** [#94](https://github.com/QuayeDNA/edunexus/issues/94)
- **[11.3] Hostel/Boarding**
  - **Entity layer:** L8
  - **Depends on:** L2 student entities, L2 staff
  - **Blocker:** none
  - **Roles affected:** admin, student, parent
  - Tasks: room inventory (capacity, gender designation, amenities); room allocation (student assignment, roommate preferences); roll call integration with attendance module; boarding fee calculation (if separate from tuition); parental visit scheduling; bed capacity management.
  - AC: Given a hostel has 50 beds and 48 are occupied, when an admin tries to assign a 49th student, then it succeeds; when a 51st student is attempted, then "No available beds" is returned.
  - ⚡ **GitHub:** [#95](https://github.com/QuayeDNA/edunexus/issues/95)
- **[11.4] Inventory & procurement**
  - **Entity layer:** L8
  - **Depends on:** none
  - **Blocker:** none
  - **Roles affected:** admin
  - Tasks: inventory catalog (items, SKU, categories, unit); stock movements (inbound, outbound, transfer, adjustment); purchase order management (create, approve, receive); supplier records; low stock alerts; inventory valuation (FIFO/weighted average).
  - AC: Given a stock item has a reorder threshold of 10 units, when the quantity drops to 10, then the system generates a "Low Stock" alert and suggests creating a purchase order.
  - ⚡ **GitHub:** [#96](https://github.com/QuayeDNA/edunexus/issues/96)
- **[11.5] Behavior gamification**
  - **Entity layer:** L8
  - **Depends on:** [#58](https://github.com/QuayeDNA/edunexus/issues/58) (4.6 Behavior/incident logging)
  - **Blocker:** none
  - **Roles affected:** student, teacher, admin
  - Tasks: points system (positive behavior awards points); badge system (achievement badges with unlock criteria); leaderboards (per class, per grade level, per school); student-facing points dashboard; teacher awards interface; admin configuration of points/badge rules.
  - AC: Given a student earns 50 positive behavior points, when the teacher awards the "Excellent Citizenship" badge (threshold: 50 pts), then the badge is unlocked and the student sees it in their profile.
  - ⚡ **GitHub:** [#97](https://github.com/QuayeDNA/edunexus/issues/97)
- **[11.6] Wellness check-ins**
  - **Entity layer:** L8
  - **Depends on:** L2 student entities
  - **Blocker:** none
  - **Roles affected:** student, counselor, admin
  - Tasks: daily/weekly mood check-in (emoji scale: 😊😐😢😡😰); counselor-flagged review queue (students with consistently negative patterns); privacy-restricted access (counselor and admin only); trend dashboard for counselor; optional anonymous submission; crisis alert escalation (configurable threshold).
  - AC: Given a student submits "Very Sad" for 5 consecutive days, when the counselor opens the review queue, then the student appears at the top with a "Flagged — 5 consecutive negative check-ins" indicator.
  - ⚡ **GitHub:** [#98](https://github.com/QuayeDNA/edunexus/issues/98)
- **[11.7] Alumni network**
  - **Entity layer:** L8
  - **Depends on:** L2 graduation/student entities
  - **Blocker:** none
  - **Roles affected:** admin, alumni (former students)
  - Tasks: alumni profile (post-graduation contact info, profession, social links); event management (reunions, workshops, invites); alumni directory with privacy controls; donation/giving tracking (optional payment integration); newsletter email sending via Resend.
  - AC: Given a student graduates and their enrollment status is `graduated`, when the admin runs "Sync to Alumni," then a student record is automatically converted to an alumni profile with an invitation email sent.
  - ⚡ **GitHub:** [#99](https://github.com/QuayeDNA/edunexus/issues/99)
- **[11.8] AI insights**
  - **Entity layer:** L8
  - **Depends on:** L4 grades, L3 attendance
  - **Blocker:** none
  - **Roles affected:** admin, teacher
  - Tasks: grade prediction model (next-term performance based on historical data); attendance anomaly detection (unexpected absence patterns); at-risk student flagging (combination of grades decline + attendance drop + behavior incidents); dashboard with risk scores; notification to admin/teacher when new at-risk students identified.
  - AC: Given a student's grades have dropped by 20% compared to last term and attendance is below 70%, when the AI insights dashboard loads, then the student appears in the "At-Risk" section with contributing factors listed.
  - ⚡ **GitHub:** [#100](https://github.com/QuayeDNA/edunexus/issues/100)

---

## 13. Updated Milestone Summary

| Phase                        | Weeks      | Cumulative | Delivers Value To      |
| ---------------------------- | ---------- | ---------- | ---------------------- |
| 1 — Foundation               | 1 (actual) | 1          | Developers             |
| 2 — Super Admin Portal       | 1 (actual) | 2          | Platform operator      |
| 3a — Admissions & Enrollment | 1–2        | 3–4        | School admin           |
| 3 — Admin Portal             | 4–6        | 7–10       | School admin           |
| 4 — Teacher Portal           | 3–4        | 10–14      | Teachers               |
| 5 — Student Portal           | 2–3        | 12–17      | Students               |
| 6 — Parent Portal            | 3–4        | 15–21      | Parents                |
| 7 — Communication            | 3–4        | 18–25      | All roles              |
| 8 — Design System            | 2–3        | 20–28      | All roles              |
| 9 — Ghana Compliance         | 2–3        | 22–31      | School admin, platform |
| 10 — Production Hardening    | 3–4        | 25–35      | Platform               |
| 11 — Extended Modules        | Ongoing    | —          | All roles              |

**Total estimated time to production-ready (Phase 10): ~25–35 weeks** (up from 22–30 in v1, reflecting the added admissions and compliance phases — both of which materially increase what you can charge for vs. a generic competitor).

---

## 14. Gap Analysis — what v1 was missing

| Missing in v1                                 | Added where                  | Why it matters                                                                 |
| --------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Admissions/applicant pipeline                 | Phase 3a                     | You can't have students without an intake process                              |
| Promotion/graduation workflow                 | Phase 3, Epic 3.2            | Schools need year-end batch processing, not just CRUD                          |
| Transfer/withdrawal/re-admission              | Phase 3a, Epic 3a.3          | Student records must persist across lifecycle changes                          |
| ID card / certificate generation              | Phase 3, Epic 3.2            | Common, expected feature; cheap to add once Student entity exists              |
| Hostel/boarding management                    | Phase 11                     | High relevance for Ghana SHS (many are boarding)                               |
| WAEC/BECE compliance exports                  | Phase 9                      | Strongest local differentiator vs. generic SaaS                                |
| GES statutory reporting                       | Phase 9                      | Required for real adoption by Ghanaian schools                                 |
| 2FA for privileged roles                      | Phase 10                     | Security expectation for admin/super_admin                                     |
| Idempotency on payments/imports               | Woven into 3a.2.2 and 6.3 AC | Prevents duplicate financial records on retry/webhook replay                   |
| Alumni network                                | Phase 11                     | Low cost, revenue/engagement upside                                            |
| Reordered: Communication before Design Polish | Phases 6/7 swapped from v1   | Parent Portal in v1 referenced announcements/notifications before they existed |
| Streamlined school onboarding                 | Phase 3, Epic 3.7 + Phase 16 | Super admin shouldn't type 10+ fields per school; school admin owns their setup |
| Self-service registration pipeline            | Phase 16, Epic 16.16         | Reduces super admin bottleneck for adding new schools; enables growth           |
| Freemium model & quota enforcement            | Phase 16, Epics 16.17–16.18  | Required before public self-service launch; prevents abuse of free tier         |
| Full billing & subscription lifecycle         | Phase 16, Epics 16.19–16.20  | Monetization; deferred until platform reaches production stability              |

---

## 15. How to use this document

1. Import each `[Phase-Epic.Issue]` block into GitHub Issues/Projects as one issue, using the template in §2.
2. Tag issues with their **entity layer** (L0–L10) as a label — lets you query "what's blocking Layer 4" directly in the tracker.
3. Before starting any issue, check its `Depends on:` field against what's actually merged, not just planned.
4. Re-run the gap analysis (§14) after each phase — new gaps will surface once real schools use the product.

---

## 16. Platform Operator — Features Spanning All Phases (super_admin)

This is the section v1 was missing entirely: v1 treated "platform operator" as something you finish in Phase 2 and never revisit. In reality, every later phase adds something the operator needs to see, meter, gate, or support. These issues are **role: super_admin only**, cut across the whole roadmap, and should be scheduled alongside (not after) the phase they attach to — pull them into whichever sprint touches that phase.

### Attach to Phase 3 (Admin Portal exists → operator needs oversight of many schools using it)

- **[16.1] Cross-tenant operations dashboard**
  - **Entity layer:** L0
  - **Depends on:** Phase 3 school data pipeline
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: aggregate KPIs across all schools (total students, enrollment growth, active admins, feature adoption per module); materialized/summary table for performance; date range selector; school-level drill-down.
  - AC: Given 50 tenant schools exist, when super_admin opens the dashboard, then aggregate stats load in under 2s via a materialized/summary table (not a live scan of all 43+ tables per request).
  - ⚡ **GitHub:** [#101](https://github.com/QuayeDNA/edunexus/issues/101)
- **[16.2] Support impersonation**
  - **Entity layer:** L0
  - **Depends on:** Phase 3 auth/session system
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: "view as" school admin feature for support; full audit log tagging (real super_admin ID + impersonated user ID); 30-minute auto-expiry session; visual indicator when impersonating (banner at top of page); exit impersonation button.
  - AC: Given an impersonation session is started, then every action taken is tagged in `audit_logs` with both the real super_admin id and the impersonated user id, and the session auto-expires after 30 minutes.
  - ⚡ **GitHub:** [#102](https://github.com/QuayeDNA/edunexus/issues/102)
- **[16.3] Plan-tier feature gating**
  - **Entity layer:** L0
  - **Depends on:** [#13](https://github.com/QuayeDNA/edunexus/issues/13) (2.3.1 billing schema), Phase 3 features
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Tasks: feature flag system tied to `school_plans` tier; middleware/API guard that checks plan tier before serving feature; upgrade prompt UI for gated features; plan/feature mapping configuration UI for super_admin; server-side enforcement (not just UI hiding).
  - AC: Given a school is on the "Basic" plan, when their admin tries to access a "Pro"-only feature, then they see an upgrade prompt instead of the feature, enforced server-side (not just hidden in UI).
  - ⚡ **GitHub:** [#103](https://github.com/QuayeDNA/edunexus/issues/103)

### Attach to Phase 6 (Payments go live → operator needs financial oversight)

- **[16.4] Platform-wide payment reconciliation**
  - **Entity layer:** L0
  - **Depends on:** [#66](https://github.com/QuayeDNA/edunexus/issues/66) (6.3 Online payments), Paystack settlement reports
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: view Paystack settlements across all schools; flag failed/disputed transactions; reconciliation report (Paystack settlement vs system records); per-school payment volume and success rate; export to CSV.
  - AC: Given 10 schools have processed payments in the last month, when super_admin views payment reconciliation, then a table shows each school's total transaction volume, success rate, and any settlement discrepancies.
  - ⚡ **GitHub:** [#104](https://github.com/QuayeDNA/edunexus/issues/104)
- **[16.5] Revenue/commission tracking**
  - **Entity layer:** L0
  - **Depends on:** [#104](https://github.com/QuayeDNA/edunexus/issues/104) (16.4 Payment reconciliation)
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: track platform commission (if taking % of school transactions); separate from subscription billing; revenue dashboard with trend chart; per-school revenue contribution; commission rate configuration per plan tier; payout scheduling.
  - AC: Given the platform takes 2% commission on all school transactions, when a school processes 10,000 GHS in fees, then the platform revenue report shows 200 GHS commission and 9,800 GHS settlement to school.
  - ⚡ **GitHub:** [#105](https://github.com/QuayeDNA/edunexus/issues/105)
- **[16.6] Dunning & subscription lifecycle automation**
  - **Entity layer:** L0
  - **Depends on:** Phase 2 billing/subscription system
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: auto-notify schools on failed subscription payment (Day 1, 7, 14, 21); grace period (30 days default — configurable); auto-suspend school access after grace period; reactivation flow (payment received → restore access); dunning email templates; dunning history log per school.
  - AC: Given a school's subscription payment fails, when 30 days pass without payment, then the school is automatically suspended, all its admin users receive a suspension notification, and a reactivation link is included.
  - ⚡ **GitHub:** [#106](https://github.com/QuayeDNA/edunexus/issues/106)

### Attach to Phase 7 (Communication → operator needs cost/abuse visibility)

- **[16.7] Platform-wide announcements**
  - **Entity layer:** L0
  - **Depends on:** [#70](https://github.com/QuayeDNA/edunexus/issues/70) (7.2 Announcements)
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: super_admin broadcasts to all school admins; separate channel from school-level announcements; use cases: maintenance windows, new feature notices, policy updates; read tracking per school; scheduled publish; priority levels.
  - AC: Given super_admin creates a "Maintenance: System down Saturday 2–4 AM" announcement, when published, then all school admins see it in their announcements feed with priority "High" badge.
  - ⚡ **GitHub:** [#107](https://github.com/QuayeDNA/edunexus/issues/107)
- **[16.8] Comms cost monitoring**
  - **Entity layer:** L0
  - **Depends on:** [#72](https://github.com/QuayeDNA/edunexus/issues/72) (7.4 SMS), [#73](https://github.com/QuayeDNA/edunexus/issues/73) (7.5 Email)
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: Africa's Talking SMS spend dashboard (per-tenant and platform-wide); Resend email volume and cost tracking; plan-tier quota enforcement (e.g., Basic = 500 SMS/month, Pro = 5000); overage alerts; usage trend chart.
  - AC: Given a school on Basic plan (500 SMS/month limit) sends 480 SMS by the 20th of the month, when the 481st SMS is attempted, then it is allowed but a warning notification is sent to the school admin about approaching quota.
  - ⚡ **GitHub:** [#108](https://github.com/QuayeDNA/edunexus/issues/108)

### Attach to Phase 9 (Compliance → operator needs bulk/multi-school tooling)

- **[16.9] Bulk compliance export across schools**
  - **Entity layer:** L0
  - **Depends on:** [#81](https://github.com/QuayeDNA/edunexus/issues/81) (9.2 WAEC export), [#80](https://github.com/QuayeDNA/edunexus/issues/80) (9.1 GES export)
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: for platform-managed clusters of affiliated schools, generate WAEC/GES exports in batch; select schools to include; consolidated export or per-school separate files; validation across all selected schools before batch generation.
  - AC: Given a super_admin selects 10 affiliated schools, when they run "Bulk WAEC Export," then 10 individual WAEC-format CSV files are generated, each school's data validated independently, and a summary report shows pass/fail per school.
  - ⚡ **GitHub:** [#109](https://github.com/QuayeDNA/edunexus/issues/109)

### Attach to Phase 10 (Hardening → this is inherently platform-operator territory)

- **[16.10] System health dashboard**
  - **Entity layer:** L0
  - **Depends on:** [#85](https://github.com/QuayeDNA/edunexus/issues/85) (10.1 Sentry), infrastructure monitoring
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: uptime monitoring widget; error rate chart (from Sentry); DB performance metrics (query time, connection count, cache hit ratio); per-tenant resource usage (storage, API calls); health check endpoints with status history.
  - AC: Given any monitored service is down for > 5 minutes, when super_admin opens the health dashboard, then the affected service is highlighted in red with "Degraded" or "Down" status and a timeline of the incident.
  - ⚡ **GitHub:** [#110](https://github.com/QuayeDNA/edunexus/issues/110)
- **[16.11] Incident status page**
  - **Entity layer:** L0
  - **Depends on:** [#110](https://github.com/QuayeDNA/edunexus/issues/110) (16.10 Health dashboard)
  - **Blocker:** none
  - **Roles affected:** super_admin, admin (read-only)
  - Tasks: public-facing status page hosted on status.edunexus.app (or sub-path); incident creation/logging by super_admin; real-time status: Operational, Degraded, Down, Maintenance; subscribe to email/SMS notifications for status changes; incident history timeline.
  - AC: Given a critical incident is declared, when super_admin publishes a status update, then the status page updates immediately and all subscribed school admins receive a notification within 5 minutes.
  - ⚡ **GitHub:** [#111](https://github.com/QuayeDNA/edunexus/issues/111)
- **[16.12] Data export & deletion tooling**
  - **Entity layer:** L0
  - **Depends on:** Phase 3 data entities must exist
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Tasks: self-service full data export for schools that cancel (all entity data in structured format — CSV/JSON); scheduled deletion after retention window (e.g., 90 days after cancellation); confirmation safeguards (admin must confirm twice); deletion log for compliance; retention policy configuration.
  - AC: Given a school cancels their subscription, when the admin requests data export, then a zip file containing all school data (students, staff, grades, fees, etc.) is generated and available for download within 24 hours.
  - AC: Given 90 days have passed since cancellation, when the deletion job runs, then all school data is deleted and a deletion confirmation is sent to the school admin's email on file.
  - ⚡ **GitHub:** [#112](https://github.com/QuayeDNA/edunexus/issues/112)

### Attach to Phase 11 (Extended modules → operator needs to package/monetize them)

- **[16.13] Module marketplace toggle**
  - **Entity layer:** L0
  - **Depends on:** [#103](https://github.com/QuayeDNA/edunexus/issues/103) (16.3 Feature gating), Phase 11 modules
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Tasks: per-school enable/disable of extended modules (Library, Transport, Hostel, etc.); tied to plan tier or add-on billing; module listing UI for super_admin (see which schools have which modules); module activation request flow for school admin; usage metrics per module.
  - AC: Given a school is on "Pro" plan which includes Library and Transport, when the super_admin views the school's modules, then Library and Transport are shown as "Active" and Hostel is "Not Included."
  - ⚡ **GitHub:** [#113](https://github.com/QuayeDNA/edunexus/issues/113)
- **[16.14] Usage-based billing hooks**
  - **Entity layer:** L0
  - **Depends on:** Phase 2 billing schema, Phase 11 modules with usage metrics
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Tasks: metering hooks for usage-based billing (SMS volume, storage usage, API calls); surface usage data to existing billing schema from Phase 2; configurable per-unit pricing; usage threshold alerts; invoice line items for usage charges.
  - AC: Given a school sends 2,000 SMS in a month at 0.05 GHS each, when the monthly invoice is generated, then an "SMS Usage: 2,000 × 0.05 GHS = 100 GHS" line item appears on the invoice.
  - ⚡ **GitHub:** [#114](https://github.com/QuayeDNA/edunexus/issues/114)

### Attach to Phase 2 (Super Admin Onboarding & Registration)

_New section — the current school+user creation flow works but is not streamlined for scale. These epics refine it into a proper onboarding pipeline, culminating in a self-service registration with screening._

- **[16.15] Streamlined school creation flow** ⏳ _deferred_
  - **Entity layer:** L0
  - **Depends on:** Phase 2 school schema + user creation
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Description: Reduce super admin's school creation from 10+ fields to 2 (name + admin email). School status starts as `setup_pending`. School admin completes their own setup via wizard ([3.7.2]). Replaces `POST /api/super-admin/schools` as the primary flow (old endpoint kept for import/backward compat).
  - Tasks: new `POST /api/super-admin/onboard` endpoint; atomically create school + admin user + audit logs; auto-generate slug from school name; send welcome email with temp password + login URL; add `setup_pending` status to school model; update super admin UI to use minimal form; update seed script.
  - AC: Given a super admin enters "Accra Academy Basic School" and "ama@example.com", when they click "Add School", then a school with auto-slug "accra-academy-basic-school" and an admin user with role "admin" are created atomically, and a welcome email is sent to ama@example.com with login credentials within 1 minute.
  - AC: Given the school is created with status `setup_pending`, when the admin logs in, then they see the [3.7.2] setup wizard and cannot access the dashboard until setup is complete.
  - ⚡ **GitHub:** [#130](https://github.com/QuayeDNA/edunexus/issues/130)

- **[16.16] Self-service registration & screening pipeline** ⏳ _deferred — far future_
  - **Entity layer:** L0
  - **Depends on:** [16.15], [3.7.2], screening infrastructure
  - **Blocker:** none
  - **Roles affected:** super_admin, prospective admin
  - Description: Public application form for new schools to register themselves. Application goes through a super admin screening queue. Approved → school provisioned with `setup_pending` status → admin completes wizard. Rejected → email notification with reason. Includes safeguards against fake registrations.
  - Tasks: public application form (school name, admin name, email, phone, GES reg number); screening queue UI for super admin (review applicant info, approve/reject with reason); automated validation of GES registration number format; optional email domain verification; rate limiting per email/IP to prevent spam; approved flow triggers same `onboard` endpoint as [16.15]; rejection email template.
  - AC: Given a prospective admin submits an application for "Fake School 123", when the super admin reviews it, then they can reject it with reason "Unable to verify GES registration" and an email is sent to the applicant within 1 minute.
  - AC: Given an approved school application, when the super admin clicks "Approve", then the school is created with `setup_pending` status, the admin account is provisioned with a set-password link (not a temp password), and a welcome email is sent.
  - ⚡ **GitHub:** [#131](https://github.com/QuayeDNA/edunexus/issues/131)

### Attach to Phase 5 (Billing & Subscription System)

_New section — the current billing schema (school_plans, school_subscriptions) exists but has no workflow integration. These epics define the full billing lifecycle. All deferred — not in current scope._

- **[16.17] Plan-tier feature gating** _(moved from 16.3 — now grouped under billing, see #103)_
  - **Entity layer:** L0
  - **Depends on:** existing billing schema
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Description: Feature flag system tied to plan tiers. Server-side enforcement ensures gated features are inaccessible by schools on lower tiers. Configuration UI for super admin to define tier-to-feature mappings.
  - Tasks: feature flag middleware checking school subscription tier; per-feature access control list defined per plan; upgrade prompt UI for gated features; super admin UI for plan/feature mapping; server-side enforcement on all API routes (not just UI hiding).
  - AC: Given a school is on the "Free" tier, when the admin tries to access a "Pro"-only feature endpoint directly, then the API returns 403 Forbidden with an upgrade message.
  - ⚡ **GitHub:** [#103](https://github.com/QuayeDNA/edunexus/issues/103)

- **[16.18] Freemium plan presets & quota system** ⏳ _deferred — far future_
  - **Entity layer:** L0
  - **Depends on:** [16.17], existing billing schema
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Description: Define standard plan tiers (Free/Starter/Pro/Enterprise) with quota limits (max students, max staff, SMS quota, storage). Free plan auto-assigned to new schools. Overage tracking with upgrade prompts.
  - Tasks: preset plan seeds (Free: 50 students, 10 staff, 100 SMS/month; Starter: 200 students, 30 staff, 500 SMS/month; etc.); quota enforcement middleware; usage tracking per billing period; upgrade prompt when quota exceeded; super admin quota override for enterprise customers.
  - AC: Given a school on the Free plan has 50 enrolled students, when an admin tries to enroll student #51, then the system rejects with "You've reached the Free plan limit of 50 students. Upgrade to continue enrolling."
  - ⚡ **GitHub:** [#126](https://github.com/QuayeDNA/edunexus/issues/126)

- **[16.19] Subscription lifecycle management** ⏳ _deferred — far future_
  - **Entity layer:** L0
  - **Depends on:** [16.17], payment gateway integration
  - **Blocker:** none
  - **Roles affected:** super_admin, admin
  - Description: Full subscription lifecycle: activate, renew, upgrade, downgrade, cancel, suspend. Trial period support. Payment gateway integration (Paystack for cards + MoMo). Pro-rated billing on plan changes. Invoice generation per billing cycle. Dunning automation for failed payments.
  - Tasks: subscription status state machine (trialing, active, past_due, canceled, suspended); Paystack subscription API integration; pro-rated billing calculations; invoice generation on billing cycle dates; payment webhook handling; dunning email automation (day 1, 7, 14, 21 after failed payment); grace period configuration; auto-suspend after N days past due.
  - AC: Given a school upgrades from Starter to Pro on day 15 of a 30-day billing cycle, when the upgrade is processed, then a pro-rated charge of (Pro price - Starter price) / 2 is calculated and the billing cycle resets to day 1.
  - ⚡ **GitHub:** [#127](https://github.com/QuayeDNA/edunexus/issues/127)

- **[16.20] Revenue & reconciliation dashboard** ⏳ _deferred — far future_
  - **Entity layer:** L0
  - **Depends on:** [#127](https://github.com/QuayeDNA/edunexus/issues/127) (16.19), payment gateway integration
  - **Blocker:** none
  - **Roles affected:** super_admin
  - Description: Platform revenue tracking, MRR/ARR metrics, payment reconciliation with Paystack settlements, commission tracking if platform takes transaction cut.
  - Tasks: revenue dashboard with MRR, ARR, churn rate, LTV; Paystack settlement reconciliation report; per-school revenue and payment history; platform commission calculation (configurable %); export to CSV; trend charts (30/90/365 day).
  - AC: Given 20 schools are on paid plans, when the super admin opens the revenue dashboard, then MRR is calculated as the sum of all active subscription prices, churn rate is shown for the last 30 days, and all data loads in under 3 seconds.
  - ⚡ **GitHub:** [#132](https://github.com/QuayeDNA/edunexus/issues/132)

**Sequencing note:** issues 16.1–16.3 are the highest priority of this set — without cross-tenant visibility and impersonation, you'll be debugging every school's issue by directly querying the database, which doesn't scale past a handful of tenants. Onboarding epics (16.15–16.16) are next priority — they reduce friction for adding new schools. Billing epics (16.17–16.20) are far future — the platform can operate without billing for an MVP phase. All deferred epics are explicitly labeled with ⏳ to make it clear they are not in current scope.

