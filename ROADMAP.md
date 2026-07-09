# EduNexus — Rewrite Roadmap

> From React 19 + Supabase (JS) → Next.js 16 + PostgreSQL (TypeScript)
> Restructured: Feature-based → Role-based (Jul 2026)

---

## Phase 1 — Foundation ✅ Complete

**Timeline:** 1 week (accelerated via subagent-driven development)
**Goal:** Deployable full-stack scaffold with auth and tenant isolation

**Completed deliverables:**
- ✅ Turborepo + pnpm workspaces (4 packages: web, database, shared, root config)
- ✅ Next.js 16 (App Router, Turbopack, TypeScript strict, Tailwind v4 CSS-first config)
- ✅ Drizzle ORM schema (43 tables) + client + helpers + seed script
- ✅ Auth.js v5 (email/password via Credentials provider, JWT sessions, scrypt password hashing)
- ✅ Multi-tenant proxy (subdomain → school_id, in-memory cache, Next.js 16 proxy.ts convention)
- ✅ Role-based route protection (5 roles: super_admin, admin, teacher, student, parent)
- ✅ Role-specific layouts + dashboards (all 5 roles with sidebar navigation)
- ✅ Dexie v4 offline schema (10 object stores) + background sync service
- ✅ GitHub Actions CI (lint, typecheck, test) + Vercel deploy workflow
- ✅ Seed script with demo school + superadmin account
- ✅ 57 unit tests passing (formatters, payroll, grade-utils)
- ✅ PostgreSQL 18 (Windows native) — migrate + seed verified
- ✅ `profiles.school_id` nullable — superadmins have no school association

**Exit criteria:**
- 🟡 `docker compose up` gives a working dev environment — **pending** (Phase 9)
- 🟡 Two subdomains resolve to separate tenant data — **pending** (requires DNS)
- 🟡 CI passes on every PR — **pending** (requires GitHub push)
- ✅ Database migrate + seed working (41 tables created)
- ✅ Login page renders at localhost:3000
- ✅ Auth.js credentials flow queries DB directly
- ✅ Proxy guards authenticated routes redirect to role-specific dashboards

---

## Phase 2 — Super Admin Portal ✅ Complete

**Timeline:** 1 week
**Goal:** Fully functional multi-tenant management console for platform operator

```
shadcn/ui → Billing Schema → Shared Infrastructure (API, UI, hooks, email, payments)
          → Dashboard → Schools CRUD → Users CRUD → Audit Logs → Plans & Subscriptions
```

**Key deliverables:**
- ✅ shadcn/ui v4 Nova installed (Base UI preset, 14+ core components)
- ✅ Billing schema: school_plans, school_subscriptions, invoices + domain/customDomain on schools
- ✅ Shared API infrastructure: response helpers, error classes, require-role guard, TanStack Query client
- ✅ Shared UI components: data-table, confirm-dialog, empty-state, page-header, stat-card
- ✅ Shared hooks: use-pagination, use-filters, use-debounce, use-payment
- ✅ Email service: Resend wrapper + welcome admin template
- ✅ Payment infrastructure: IPaymentProvider interface, Paystack provider, payment button/status, webhook
- ✅ Super admin dashboard: real stats (schools, users, signups) from DB queries
- ✅ School management: CRUD, list with search/filter, create with seed (year + terms + grades), detail with tabs, edit
- ✅ User management: CRUD, create admin per school, auto-generate password, send welcome email
- ✅ Audit log viewer: filterable by action/date/school
- ✅ Billing management: plans CRUD, subscriptions list with school/plan join

**Post-hoc fixes (Jul 2026):**
- 🛠 Removed Radix-based `form.tsx` custom component — forms rewritten using `react-hook-form` `Controller` + Nova `Label`/`Input` primitives
- 🛠 Moved `cn()` utility from `lib/utils/cn.ts` to `lib/utils.ts` per shadcn conventions
- 🛠 Fixed `numeric` price columns — Drizzle expects `string`, routes now convert with `String()`
- 🛠 Added missing `userId`/`schoolId` to all `audit_logs` inserts
- 🛠 Fixed DB client import — `@edunexus/database` exports `createClient()`, not `db` singleton
- 🛠 Fixed badge `secondary` variant (Nova uses `outline`), sonner toast import path, `require-role` type errors
- 🛠 Added `suppressHydrationWarning` to `<html>` element for browser extension compatibility

---

## Phase 3 — Admin (School) Portal ⬜ Pending

**Goal:** School admin manages students, staff, classes, scheduling, fees, and payroll

```
Students → Staff → Classes → Subjects → Timetable → Fees → Payroll → Reports
```

**Key deliverables:**
- Students: List, detail, new/edit, bulk import
- Staff: List, detail, new/edit, leave management
- Classes & Subjects: CRUD, assignment, roster
- Academic Years & Terms: CRUD, set current
- Timetable: Drag-drop grid, conflict detection, PDF export
- Fee setup: categories, schedules, auto-generation of student fees
- Expense tracking
- Payroll runs: draft → approve → process, SSNIT (5.5%/13%) + Ghana PAYE
- Payslip PDF generation
- Reports hub

---

## Phase 4 — Teacher Portal ⬜ Pending

**Goal:** Teachers can mark attendance, enter grades, generate report cards, manage lesson plans

```
Attendance → Assessments → Grades → Report Cards → Lesson Plans
```

**Key deliverables:**
- Teacher dashboard: classes today, pending assessments, quick actions
- Attendance marking: class grid, date picker, status toggles
- Assessment/grade entry: score grid, weighted averages, grade distribution
- Report cards: batch generation, Ghana format, PDF, lock after finalization
- Lesson plan management: create, edit, publish

---

## Phase 5 — Student Portal ⬜ Pending

**Goal:** Students view their timetable, grades, attendance, and fee status

```
My Classes → Timetable → Grades → Attendance → Fees
```

**Key deliverables:**
- Student dashboard: current term overview
- Class schedule / Timetable view
- Grade history with report card PDFs
- Attendance record
- Fee statement and payment status

---

## Phase 6 — Parent Portal ⬜ Pending

**Goal:** Parents/guardians monitor their children's progress and handle payments

```
Children → Attendance → Progress → Fees → Payments (Paystack/MoMo)
```

**Key deliverables:**
- Parent dashboard: all children overview
- Child's attendance, grades, fee status views
- Online fee payment via Paystack (card + MoMo)
- Payment history and receipts
- School announcements

---

## Phase 7 — Design System & Polish ⬜ Pending

**Goal:** Production-grade UI across all portals

```
Theme → Animations → Responsive → Accessibility → States
```

**Key deliverables:**
- Full design system: colors, typography, spacing, shadows
- Animation system: transitions, micro-interactions
- Responsive layouts for mobile/tablet
- Accessibility audit and fixes
- Empty/loading/error states across all pages

---

## Phase 8 — Cross-Role Communication ⬜ Pending

**Goal:** Announcements, messaging, and notification infrastructure

```
Announcements → Messaging → SMS/Email → Notifications
```

**Key deliverables:**
- In-app notifications (real-time via WebSockets)
- Targeted announcements (by role/class/school)
- Internal messaging (compose, inbox, threads)
- SMS via Africa's Talking
- Email via Resend
- Notification preferences

---

## Phase 9 — Production Hardening ⬜ Pending

**Goal:** Production-ready reliability, performance, and security

```
Monitoring → Security → Backups → PWA → Performance → Docs
```

**Key deliverables:**
- Sentry error monitoring
- Rate limiting + security headers
- Automated PostgreSQL backups
- PWA with full offline support (Dexie sync)
- Performance optimization (React Compiler, images, caching)
- Documentation (admin manual, deploy guide, API reference)
- Load testing (k6)

---

## Phase 10 — Extended Features ⬜ Pending

**Goal:** Differentiation and innovation

```
Library → Transport → Inventory → Gamification → Wellness → AI
```

**Key deliverables:**
- Library management (catalog, loans, fines, barcode scanner)
- Transport management (fleet, routes, manifests, GPS)
- Inventory & procurement (stock movements, purchase orders)
- Behavior gamification (points, badges, leaderboards)
- Wellness check-ins (mood tracking, flagged reviews)
- AI insights (grade prediction, attendance anomalies)

---

## Milestone Summary

| Phase | Weeks | Cumulative | Delivers Value To |
|---|---|---|---|
| 1 — Foundation | 1 (actual) | 1 | Developers |
| 2 — Super Admin Portal | 1 (actual) | 2 | Platform operator |
| 3 — Admin Portal | 4-6 | 6-8 | School admin |
| 4 — Teacher Portal | 3-4 | 9-12 | Teachers |
| 5 — Student Portal | 2-3 | 11-15 | Students |
| 6 — Parent Portal | 3-4 | 14-19 | Parents |
| 7 — Design System | 2-3 | 16-22 | All roles |
| 8 — Communication | 3-4 | 19-26 | All roles |
| 9 — Production | 3-4 | 22-30 | Platform |
| 10 — Extended | Ongoing | — | All roles |

**Total estimated time to production-ready (Phase 9): ~22-30 weeks**

---

## Key Decisions Summary

- **Backend:** Custom Next.js API + PostgreSQL via Drizzle ORM
- **Multi-tenancy:** Shared DB, proxy-enforced `school_id` isolation
- **URLs:** Subdomain-based (`{school}.edunexus.com`) + custom domain support
- **Phases:** Role-based (not feature-based) — each phase delivers a complete portal
- **Offline:** Optimistic writes → Dexie → background sync → API (Phase 9)
- **Payments:** Paystack via abstract provider interface (Phase 2 infra, Phase 6 usage)
- **SMS:** Africa's Talking (Phase 8)
- **UI:** shadcn/ui primitives → design system polish (Phase 7)
- **Testing:** Vitest + Playwright (unit, integration, component, E2E, tenant isolation)
- **Deploy:** Vercel (Next.js) + Railway (PostgreSQL + Redis)
