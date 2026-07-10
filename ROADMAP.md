# EduNexus — Roadmap v2

> Next.js 16 + PostgreSQL (Drizzle) + TypeScript, multi-tenant school management platform
> Strategy: **Entity-Layered backend, Role-Delivered frontend** (hybrid of your entity-based instinct and the existing role-based phase plan)
> Superseding: original "Feature-based → Role-based" roadmap (Jul 2026)

---

## 0. What changed and why

Your original plan organizes phases **by portal** (Admin → Teacher → Student → Parent). That's the right lens for *shipping visible value*, but it hides two problems:

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

Every phase below is still organized around **who it's for**, same as your original plan — the entity graph in §1 only decides *internal build order*, it doesn't replace role-based delivery. Use this table to see, at a glance, which role a phase primarily serves and which roles get secondary/read-only exposure.

| Phase | super_admin (Platform Operator) | admin (School) | teacher | student | parent |
|---|:---:|:---:|:---:|:---:|:---:|
| 1 — Foundation | ✅ primary | — | — | — | — |
| 2 — Super Admin Portal | ✅ primary | — | — | — | — |
| 3a — Admissions & Enrollment | — | ✅ primary | — | — | incidental (application form) |
| 3 — Admin Portal | 🔧 ongoing ops (§16) | ✅ primary | — | — | — |
| 4 — Teacher Portal | 🔧 ongoing ops (§16) | secondary (oversight) | ✅ primary | — | — |
| 5 — Student Portal | — | secondary (oversight) | secondary (input source) | ✅ primary | — |
| 6 — Parent Portal | 🔧 ongoing ops (§16) | secondary (oversight) | — | secondary (data source) | ✅ primary |
| 7 — Communication | 🔧 ongoing ops (§16) | ✅ shared | ✅ shared | ✅ shared | ✅ shared |
| 8 — Design System | ✅ shared | ✅ shared | ✅ shared | ✅ shared | ✅ shared |
| 9 — Ghana Compliance | 🔧 ongoing ops (§16) | ✅ primary | secondary | — | — |
| 10 — Production Hardening | ✅ primary (platform-wide) | secondary | — | — | — |
| 11 — Extended Modules | 🔧 ongoing ops (§16) | ✅ primary | varies | varies | varies |

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

## 3. Phase 3a — Admissions & Enrollment *(NEW — insert before old Phase 3)*

**Goal:** Get students and guardians into the system properly, instead of assuming they already exist.
**Timeline:** 1–2 weeks

### Epic 3a.1 — Applicant intake
- **[3a.1.1] Public application form** — Depends on: none — Roles: admin, applicant (unauthenticated)
  - Tasks: public form route per school subdomain; file upload for documents (birth cert, prior report card); application status enum (`submitted`, `under_review`, `accepted`, `rejected`, `waitlisted`); email confirmation via Resend.
  - AC: Given a valid subdomain, when a guardian submits the form, then an `Applicant` row is created with status `submitted` and a confirmation email is sent within 1 minute.

- **[3a.1.2] Admissions review queue (admin)** — Depends on: 3a.1.1
  - Tasks: list/filter applicants by status/grade level; detail view with documents; accept/reject/waitlist action; capacity check against `Class` max size.
  - AC: Given a class is at capacity, when an admin tries to accept an applicant into it, then the system warns and requires override confirmation.

### Epic 3a.2 — Student & Guardian conversion
- **[3a.2.1] Accepted → Student conversion** — Depends on: 3a.1.2, Layer 1 (Class/Year must exist)
  - Tasks: convert `Applicant` to `Student` + `Enrollment` in one transaction; generate student ID number (school-configurable format); create or link `Guardian` record(s), support multiple guardians per student and multiple students per guardian.
  - AC: Given an applicant is accepted, when the admin confirms conversion, then a `Student`, `Enrollment`, and at least one `Guardian` link exist, and the operation is atomic (no partial state on failure).

- **[3a.2.2] Direct student entry (bypass admissions)** — Depends on: 3a.2.1
  - Tasks: manual "add existing student" flow for schools onboarding mid-year; bulk CSV import with column mapping and validation report.
  - AC: Given a CSV with 200 rows where 5 have invalid data, when imported, then 195 succeed, 5 are reported with row-level error messages, and nothing partially commits per invalid row.

### Epic 3a.3 — Lifecycle events
- **[3a.3.1] Transfer / Withdrawal / Re-admission**
  - Tasks: status field on `Enrollment` (`active`, `transferred_out`, `withdrawn`, `graduated`); transfer certificate generation (PDF); re-admission flow reuses existing `Student` record.
  - AC: Given a withdrawn student, when re-admitted next year, then historical records (grades, attendance) remain linked to the same `Student` id.

---

## 4. Phase 3 — Admin (School) Portal *(restructured in entity order)*

**Goal:** School admin manages the full academic and operational lifecycle.
**Timeline:** 4–6 weeks

### Epic 3.1 — Academic structure (Layer 1)
- **[3.1.1] Academic Years & Terms CRUD** — set current year/term, lock past terms from edits
  - AC: Given a term is marked `locked`, when any user attempts to edit grades/attendance in it, then the write is rejected with a clear error.
- **[3.1.2] Grade Levels & Classes CRUD** — capacity, homeroom teacher assignment
- **[3.1.3] Subjects & Curriculum CRUD** — subject-to-grade-level mapping, core vs elective flag
- **[3.1.4] Class-Subject-Teacher assignment matrix** — bulk assign, conflict warning if teacher already booked

### Epic 3.2 — Students (Layer 2, list/detail beyond admissions)
- **[3.2.1] Student list/detail/edit** — filters by class, status, guardian
- **[3.2.2] Promotion & graduation workflow** — Depends on: Layer 4 grades/attendance thresholds
  - Tasks: end-of-year batch promotion tool with rule preview (e.g. min attendance %, pass mark); graduation marks `Enrollment.status = graduated` and issues certificate.
  - AC: Given promotion rules are configured, when admin runs "promote all," then a preview list shows who passes/fails rules before committing, and committing is reversible for 24h via an audit-logged undo.
- **[3.2.3] ID card generation** — PDF/print template with photo, QR code linking to student record

### Epic 3.3 — Staff
- **[3.3.1] Staff list/detail/new/edit** — employment contract (type, salary, start/end date)
- **[3.3.2] Leave management** — request, approve/reject, balance tracking per leave type
- **[3.3.3] Staff attendance** (Layer 3, if not covered by teacher self check-in)

### Epic 3.4 — Timetable (Layer 3)
- **[3.4.1] Timetable builder** — drag-drop grid, per class/teacher/room
  - AC: Given two classes are assigned the same teacher at the same period, then the system flags a conflict before save.
- **[3.4.2] Timetable PDF export** — per class and per teacher

### Epic 3.5 — Fees & Payroll (Layer 5)
- **[3.5.1] Fee categories & schedules** — recurring vs one-time, per grade level or per student overrides
- **[3.5.2] Auto-generation of student invoices** — run per term, idempotent (safe to re-run)
- **[3.5.3] Scholarships & discounts** — percentage or fixed, approval workflow, audit trail
- **[3.5.4] Expense tracking** — categories, receipts upload, monthly summary
- **[3.5.5] Payroll runs** — draft → approve → process states; SSNIT (5.5% employee / 13% employer), Ghana PAYE bands
  - AC: Given a payroll run is in `approved` state, then employee salary fields become read-only until the run is reverted by a super_admin-level action (audit logged).
- **[3.5.6] Payslip PDF generation** — per staff, batch export

### Epic 3.6 — Reports hub
- **[3.6.1] Cross-entity report builder** — attendance summary, fee arrears, grade distribution, payroll cost center
- **[3.6.2] Scheduled/exportable reports** — CSV/PDF, email delivery option

---

## 5. Phase 4 — Teacher Portal

**Timeline:** 3–4 weeks
**Depends on:** Layer 3 (Timetable, Attendance), Layer 4 (Assessment)

- **[4.1] Teacher dashboard** — today's classes, pending assessments, unread messages
- **[4.2] Attendance marking** — class grid, date picker, bulk status set, edit-within-window rule
  - AC: Given attendance was marked >48h ago, when a teacher tries to edit it, then they must provide a reason, and the edit is logged in `audit_logs`.
- **[4.3] Assessment & grade entry** — score grid per assessment, weighted average calc, grade distribution chart
- **[4.4] Report card generation (teacher-triggered draft)** — Ghana format, comments field, lock after admin finalization
- **[4.5] Lesson plans** — create/edit/publish, optional curriculum-linked template
- **[4.6] Behavior/incident logging** (feeds Layer 8 gamification later) — quick-log positive/negative behavior notes

---

## 6. Phase 5 — Student Portal

**Timeline:** 2–3 weeks

- **[5.1] Student dashboard** — current term snapshot (grades trend, attendance %, fee balance)
- **[5.2] Timetable view**
- **[5.3] Grade history + report card PDF download**
- **[5.4] Attendance record view**
- **[5.5] Fee statement view** (read-only; payment happens in Parent Portal for minors, or self-service if adult/tertiary student — flag as config option)

---

## 7. Phase 6 — Parent Portal

**Timeline:** 3–4 weeks
**Depends on:** Layer 5 (Finance), Guardian-Student link (3a.2.1)

- **[6.1] Multi-child dashboard** — switch between children, alerts (low attendance, fee overdue)
- **[6.2] Child detail views** — attendance, grades, fees (reuse Student Portal components, guardian-scoped)
- **[6.3] Online fee payment** — Paystack (card + MoMo channel), receipt generation, partial payment support
  - AC: Given a payment webhook is received twice for the same reference, then only one `Payment` record is created (idempotency key on transaction reference).
- **[6.4] Payment history**
- **[6.5] Announcements feed** (consumes Layer 6, built next phase — can stub read-only first)

---

## 8. Phase 7 — Cross-Role Communication *(moved earlier — was Phase 8)*

**Rationale for reordering:** Parent Portal (Phase 6) references announcements and payment notifications; building comms after Phase 6 means Phase 6 ships with dead stubs. Build the entity layer here, expose it progressively.

**Timeline:** 3–4 weeks

- **[7.1] Notification infrastructure** — in-app (WebSocket or polling fallback), notification preferences per user
- **[7.2] Announcements** — targeted by role/class/school, scheduled publish
- **[7.3] Internal messaging** — compose, inbox, threads (teacher↔parent, admin↔staff)
- **[7.4] SMS via Africa's Talking** — templated (fee reminder, attendance alert, report card ready)
- **[7.5] Email via Resend** — shared templates with SMS content where overlapping
- **[7.6] Delivery log & retry** — failed SMS/email visibility for admin, manual resend

---

## 9. Phase 8 — Design System & Polish

**Timeline:** 2–3 weeks (unchanged from original, sequenced after portals exist so polish has real screens to apply to)

- **[8.1] Design tokens** — colors, typography, spacing, shadows (finalize, don't re-derive per phase)
- **[8.2] Animation system** — transitions, micro-interactions
- **[8.3] Responsive audit** — mobile/tablet across all 5 role portals
- **[8.4] Accessibility audit** — WCAG AA pass, keyboard nav, screen reader labels
- **[8.5] Empty/loading/error states** — standardized components applied everywhere (should already exist from Phase 2 shared UI — this is the audit/gap-fill pass)

---

## 10. Phase 9 — Ghana Compliance & Reporting *(NEW)*

**Goal:** This is likely your strongest market differentiator — most generic school SaaS doesn't handle this.
**Timeline:** 2–3 weeks

- **[9.1] GES-format reporting exports** — enrollment census, staff establishment returns
- **[9.2] BECE/WASSCE candidate registration export** — data format matching WAEC's expected candidate upload structure; field validation (index number format, subject combinations)
- **[9.3] Report card format compliance** — confirm generated report cards match GES-approved formats for basic and SHS levels
- **[9.4] SSNIT/PAYE statutory export** — monthly filing-ready export (Tier 1 & 2 contributions, PAYE remittance schedule)
- **[9.5] Academic calendar alignment** — GES term dates as selectable presets when creating academic years

---

## 11. Phase 10 — Production Hardening

**Timeline:** 3–4 weeks (unchanged from original, renumbered)

- **[10.1] Sentry error monitoring**
- **[10.2] Rate limiting + security headers** — plus 2FA for admin/super_admin roles (addition)
- **[10.3] Automated PostgreSQL backups** — restore drill documented and tested, not just backup-scheduled
- **[10.4] PWA + Dexie offline sync** — conflict resolution strategy documented (last-write-wins vs merge)
- **[10.5] Performance optimization** — React Compiler, image optimization, caching, DB indexing pass on all 43+ tables
- **[10.6] Documentation** — admin manual, deploy guide, API reference
- **[10.7] Load testing (k6)** — target: concurrent load simulating peak (report card release day, fee due date)
- **[10.8] `docker compose up` dev environment** — infra services containerized (PostgreSQL, Redis, MinIO, Mailpit); app runs via `pnpm dev`. Phase 1 exit criterion met.

---

## 12. Phase 11 — Extended & Differentiating Modules

**Timeline:** Ongoing, prioritize by customer demand post-launch

- **[11.1] Library** — catalog, loans, fines, barcode scanner support
- **[11.2] Transport** — fleet, routes, manifests, GPS tracking, parent live-view of bus
- **[11.3] Hostel/Boarding** *(NEW — high relevance for Ghana SHS)* — room inventory, allocation, roll call integration with attendance
- **[11.4] Inventory & procurement** — stock movements, purchase orders, supplier records
- **[11.5] Behavior gamification** — points, badges, leaderboards (consumes 4.6 incident log)
- **[11.6] Wellness check-ins** — mood tracking, counselor-flagged review queue, privacy-restricted access
- **[11.7] Alumni network** *(NEW)* — post-graduation contact retention, event invites
- **[11.8] AI insights** — grade prediction, attendance anomaly detection, at-risk student flagging

---

## 13. Updated Milestone Summary

| Phase | Weeks | Cumulative | Delivers Value To |
|---|---|---|---|
| 1 — Foundation | 1 (actual) | 1 | Developers |
| 2 — Super Admin Portal | 1 (actual) | 2 | Platform operator |
| 3a — Admissions & Enrollment | 1–2 | 3–4 | School admin |
| 3 — Admin Portal | 4–6 | 7–10 | School admin |
| 4 — Teacher Portal | 3–4 | 10–14 | Teachers |
| 5 — Student Portal | 2–3 | 12–17 | Students |
| 6 — Parent Portal | 3–4 | 15–21 | Parents |
| 7 — Communication | 3–4 | 18–25 | All roles |
| 8 — Design System | 2–3 | 20–28 | All roles |
| 9 — Ghana Compliance | 2–3 | 22–31 | School admin, platform |
| 10 — Production Hardening | 3–4 | 25–35 | Platform |
| 11 — Extended Modules | Ongoing | — | All roles |

**Total estimated time to production-ready (Phase 10): ~25–35 weeks** (up from 22–30 in v1, reflecting the added admissions and compliance phases — both of which materially increase what you can charge for vs. a generic competitor).

---

## 14. Gap Analysis — what v1 was missing

| Missing in v1 | Added where | Why it matters |
|---|---|---|
| Admissions/applicant pipeline | Phase 3a | You can't have students without an intake process |
| Promotion/graduation workflow | Phase 3, Epic 3.2 | Schools need year-end batch processing, not just CRUD |
| Transfer/withdrawal/re-admission | Phase 3a, Epic 3a.3 | Student records must persist across lifecycle changes |
| ID card / certificate generation | Phase 3, Epic 3.2 | Common, expected feature; cheap to add once Student entity exists |
| Hostel/boarding management | Phase 11 | High relevance for Ghana SHS (many are boarding) |
| WAEC/BECE compliance exports | Phase 9 | Strongest local differentiator vs. generic SaaS |
| GES statutory reporting | Phase 9 | Required for real adoption by Ghanaian schools |
| 2FA for privileged roles | Phase 10 | Security expectation for admin/super_admin |
| Idempotency on payments/imports | Woven into 3a.2.2 and 6.3 AC | Prevents duplicate financial records on retry/webhook replay |
| Alumni network | Phase 11 | Low cost, revenue/engagement upside |
| Reordered: Communication before Design Polish | Phases 6/7 swapped from v1 | Parent Portal in v1 referenced announcements/notifications before they existed |

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
- **[16.1] Cross-tenant operations dashboard** — aggregate KPIs across all schools: total students, enrollment growth, active admins, feature adoption per module.
  - AC: Given 50 tenant schools exist, when super_admin opens the dashboard, then aggregate stats load in under 2s via a materialized/summary table (not a live scan of all 43+ tables per request).
- **[16.2] Support impersonation** — super_admin can "view as" a school admin for support/debugging, fully audit-logged, time-boxed session.
  - AC: Given an impersonation session is started, then every action taken is tagged in `audit_logs` with both the real super_admin id and the impersonated user id, and the session auto-expires after 30 minutes.
- **[16.3] Plan-tier feature gating** — enforce which modules (payroll, advanced reports, etc.) are available per `school_plans` tier, not just billed.
  - AC: Given a school is on the "Basic" plan, when their admin tries to access a "Pro"-only feature, then they see an upgrade prompt instead of the feature, enforced server-side (not just hidden in UI).

### Attach to Phase 6 (Payments go live → operator needs financial oversight)
- **[16.4] Platform-wide payment reconciliation** — view Paystack settlements across all schools, flag failed/disputed transactions.
- **[16.5] Revenue/commission tracking** — if the platform takes a cut of school transaction volume, track and report it separately from subscription billing.
- **[16.6] Dunning & subscription lifecycle automation** — auto-notify schools on failed subscription payment, grace period, auto-suspend after N days, reactivation flow.

### Attach to Phase 7 (Communication → operator needs cost/abuse visibility)
- **[16.7] Platform-wide announcements** — super_admin broadcasts to all school admins (maintenance windows, new feature notices), separate channel from school-level announcements.
- **[16.8] Comms cost monitoring** — Africa's Talking SMS spend and Resend email volume, per-tenant and platform-wide, with plan-tier quota enforcement.

### Attach to Phase 9 (Compliance → operator needs bulk/multi-school tooling)
- **[16.9] Bulk compliance export across schools** — for platform-managed clusters of schools (e.g. a group of affiliated schools), generate WAEC/GES exports in batch rather than one school at a time.

### Attach to Phase 10 (Hardening → this is inherently platform-operator territory)
- **[16.10] System health dashboard** — uptime, error rates (from Sentry), DB performance, per-tenant resource usage.
- **[16.11] Incident status page** — public-facing status page for school admins during outages.
- **[16.12] Data export & deletion tooling** — for schools that cancel/offboard: full data export (self-service) and scheduled deletion after retention window, with confirmation safeguards.

### Attach to Phase 11 (Extended modules → operator needs to package/monetize them)
- **[16.13] Module marketplace toggle** — per-school enable/disable of extended modules (Library, Transport, Hostel, etc.), tied to plan tier or add-on billing.
- **[16.14] Usage-based billing hooks** — for modules billed by usage (e.g. SMS volume, storage), meter and surface to the existing billing schema from Phase 2.

**Sequencing note:** issues 16.1–16.3 are the highest priority of this set — without cross-tenant visibility and impersonation, you'll be debugging every school's issue by directly querying the database, which doesn't scale past a handful of tenants.