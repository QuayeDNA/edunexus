# EduNexus — Phase Restructure (Role-Based)

> **Date:** 2026-07-09
> **Status:** Approved
> **Supersedes:** Phase 2-7 in the original design doc (`2026-07-08-edunexus-rewrite-design.md`)

## Motivation

The original plan grouped phases by feature domain (Attendance, Finance, Payroll, etc.). This meant each phase delivered incomplete experiences across all roles — an admin could manage students but teachers couldn't mark attendance, students couldn't view grades, and parents couldn't pay fees.

**New approach:** Group phases by **user role**. Each phase delivers a complete, working vertical slice (backend APIs + frontend pages) for one stakeholder. Features are redistributed into the role phase that owns them.

## Benefits

- **Incremental value:** Each phase ships a usable portal for a real user
- **Clear ownership:** Every API route and page belongs to exactly one role
- **Testable milestones:** End-to-end flows are testable per phase
- **Shared infrastructure early:** API patterns, UI components, hooks, payment/email services all built in Phase 2, reused by all later phases

## Updated Phase Map

| # | Phase | Primary Stakeholder | What Gets Built |
|---|---|---|---|
| **1** | Foundation | — | ✅ Complete. Next.js, Drizzle, Auth.js, proxy, CI |
| **2** | **Super Admin Portal** | Platform operator | School CRUD, user lifecycle, billing schema, payment infrastructure, email service, audit logs, shadcn/ui |
| **3** | **Admin (School) Portal** | School admin | Students, staff, classes, subjects, timetable, fee setup, payroll, reports |
| **4** | **Teacher Portal** | Teachers | Attendance marking, assessment/grade entry, report cards, lesson plans |
| **5** | **Student Portal** | Students | View timetable, grades, report cards, attendance, fee status |
| **6** | **Parent Portal** | Parents/guardians | Children overview, payments (Paystack/MoMo), communication |
| **7** | **Design System & Polish** | All | Full design system, animations, responsive, a11y, all UI states |
| **8** | **Cross-Role Communication** | All | Announcements, messaging, SMS/Email, notification preferences, advanced payroll |
| **9** | **Production Hardening** | Platform | Sentry, rate limiting, backups, PWA + offline sync, perf, security |
| **10** | **Extended Features** | All | Library, transport, inventory, behavior tracking, AI insights |

## Feature Redistribution

| Feature | Old Phase | New Phase | Owner Role |
|---|---|---|---|
| Student CRUD | 2 | **3** | Admin |
| Staff CRUD | 2 | **3** | Admin |
| Classes & Subjects | 2 | **3** | Admin |
| Timetable | 2 | **3** | Admin |
| Assessments & Grades | 2 | **4** | Teacher |
| Report Cards | 2 | **4** | Teacher |
| Attendance | 3 | **4** | Teacher |
| Fee Setup | 3 | **3** | Admin |
| Payments (parents) | 3 | **6** | Parent |
| Expense Tracking | 3 | **3** | Admin |
| Payroll | 4 | **3** | Admin |
| Messaging | 4 | **8** | All |
| Notification | 4 | **8** | All |
| SMS/Email | 4 | **8** | All |
| Super Admin Portal | 5 | **2** | Super Admin |
| Teacher Dashboard | 5 | **4** | Teacher |
| Student Dashboard | 5 | **5** | Student |
| Parent Dashboard | 5 | **6** | Parent |
| Design System | — | **7** | All |

## Key Design Decisions

### Payment Infrastructure (Phase 2)
- Abstract `IPaymentProvider` interface with Paystack implementation
- Reusable frontend components (payment button, status badge)
- Webhook handler pattern
- Billing schema (plans + subscriptions) ready for future pricing model
- **No specific pricing model** — infra is designed to support any model later

### Email Service (Phase 2)
- Minimal Resend wrapper for transactional emails
- Welcome email on school admin account creation
- Templates expandable per phase need

### Shared Infrastructure
- All API patterns, UI components, and hooks built in Phase 2
- Every subsequent phase imports from `@/lib/api/`, `@/components/`, `@/hooks/`
- Consistent response envelope across all API routes

## Existing Phase 1 (Complete)

Phase 1 remains unchanged. The foundation includes:
- Next.js 16 App Router with Turbopack
- PostgreSQL 17 + Drizzle ORM (41 tables)
- Auth.js v5 with Credentials provider (scrypt password hashing)
- Proxy.ts for tenant resolution + auth guarding
- Role-based route groups for all 5 roles
- Seed script creating demo school + super admin
- 57 passing tests, 5/5 typecheck passes
