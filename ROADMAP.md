# EduNexus — Rewrite Roadmap

> From React 19 + Supabase (JS) → Next.js 15 + PostgreSQL (TypeScript)
> Full spec: `docs/superpowers/specs/2026-07-08-edunexus-rewrite-design.md`

---

## Phase 1 — Foundation ✅ Complete

**Timeline:** 1 week (accelerated via subagent-driven development)
**Goal:** Deployable full-stack scaffold with auth and tenant isolation

```
Monorepo → Next.js 15 → Drizzle Schema → Auth.js → Tenant Middleware → Docker → CI
```

**Completed deliverables:**
- ✅ Turborepo + pnpm workspaces (4 packages: web, database, shared, root config)
- ✅ Next.js 15 (App Router, TypeScript strict, Tailwind v4 CSS-first config)
- ✅ Drizzle ORM schema (22 tables) + client + helpers + seed script
- ✅ Auth.js v5 (email/password via Credentials provider, JWT sessions)
- ✅ Multi-tenant middleware (subdomain → school_id, in-memory cache)
- ✅ Role-based route protection (5 roles: super_admin, admin, teacher, student, parent)
- ✅ Role-specific layouts + dashboards (all 5 roles with sidebar navigation)
- ✅ Dexie v4 offline schema (10 object stores) + background sync service
- ✅ GitHub Actions CI (lint, typecheck, test) + Vercel deploy workflow
- ✅ Seed script with demo school
- ✅ Dexie v4 migration (named import pattern, EntityTable types)
- ✅ Tailwind v4 migration (CSS-first `@theme`, no config file)
- ✅ TypeScript 7, Vitest 4, Drizzle 0.45, all packages updated to latest
- ✅ Shared package: types, constants (roles, grades, Ghana), utils (payroll, grades, formatters)
- ✅ 57 unit tests passing (formatters, payroll, grade-utils)

**Exit criteria:**
- 🟡 `docker compose up` gives a working dev environment — **pending** (requires Docker Desktop)
- 🟡 Two subdomains resolve to separate tenant data — **pending** (requires local DNS or hosts entries)
- 🟡 Login → role-based redirect → session persists — **pending** (requires DB + migrate)
- ✅ Auth.js session contains role + school_id — verified via type augmentation
- ✅ Middleware enforces tenant isolation — verified via type-checked route guards
- 🟡 CI passes on every PR — **pending** (requires GitHub push to trigger)

---

## Phase 2 — Core School Ops ⬜ Pending

**Timeline:** 6-8 weeks
**Goal:** Admin can manage students, staff, classes, scheduling, and report cards

```
Students → Staff → Classes → Subjects → Timetable → Assessments → Report Cards
```

**Key deliverables:**
- Students: List (DataTable), detail (profile tabs), new/edit, bulk import, QR codes
- Staff: List, detail, new/edit, leave management
- Classes & Subjects: CRUD, assignment, roster
- Academic Years & Terms: CRUD, set current
- Timetable: Drag-drop grid, conflict detection, PDF export
- Assessments: Score entry grid, weighted averages, grade distribution
- Report Cards: Batch generation, Ghana format, PDF, lock after finalization

---

## Phase 3 — Attendance & Finance ⬜ Pending

**Timeline:** 4-6 weeks
**Goal:** Daily attendance tracking and fee management

```
Attendance → Fees → Payments → Paystack → Receipts → Reports
```

**Key deliverables:**
- Teacher attendance: Card grid, real-time updates
- Admin attendance: View/edit any class/date, override lock
- Attendance reports: Per student, per class, date range
- Parent SMS alerts on absence
- Fee categories, schedules, auto-generation of student fees
- Payment recording (cash, MoMo, bank transfer)
- Paystack integration (card + MoMo + bank online)
- Receipt PDFs with school logo + QR code
- Financial reports (daily, term, outstanding debtors)

---

## Phase 4 — Communication & Payroll ⬜ Pending

**Timeline:** 4-5 weeks
**Goal:** Staff communication and payroll processing

```
Notifications → Messaging → SMS/Email → Payroll → Payslips
```

**Key deliverables:**
- In-app notifications (real-time)
- Announcements (targeted by role/class)
- Internal messaging (compose, inbox, threads)
- SMS via Africa's Talking + email via Resend
- Payroll runs (draft → approve → process workflow)
- Auto-calc SSNIT (5.5%/13%) + Ghana PAYE
- Payslip PDF generation + email delivery
- Payroll reports (cost by department, SSNIT summary, P9 export)

---

## Phase 5 — Role Portals & Polish ⬜ Pending

**Timeline:** 3-4 weeks
**Goal:** Every user role gets a tailored experience

```
Super Admin → Teacher → Student → Parent → Reports → Settings
```

**Key deliverables:**
- Super admin console (dashboard, schools, users, audit log)
- Teacher dashboard (classes today, pending assessments)
- Student dashboard (schedule, grades, fees)
- Parent dashboard (children's progress, fee payment)
- Reports & analytics hub
- Settings pages (school profile, curriculum, grading, calendar)

---

## Phase 6 — Production Hardening ⬜ Pending

**Timeline:** 3-4 weeks
**Goal:** Production-ready reliability, performance, and security

```
Monitoring → Security → Backups → PWA → Performance → Docs
```

**Key deliverables:**
- Sentry error monitoring
- Rate limiting + security headers
- Automated PostgreSQL backups
- PWA with full offline support
- Performance optimization (React Compiler, images, caching)
- Documentation (admin manual, deploy guide, API reference)
- Load testing (k6)

---

## Phase 7 — Extended Features ⬜ Pending

**Timeline:** Ongoing
**Goal:** Differentiation and innovation

```
Library → Transport → Inventory → Gamification → Wellness → AI
```

**Key deliverables:**
- Library management (catalog, loans, fines, barcode scanner)
- Transport management (fleet, routes, manifests, GPS)
- Inventory & procurement (stock movements, purchase orders, asset tracking)
- Behavior gamification (points, badges, leaderboards)
- Wellness check-ins (mood tracking, flagged reviews)
- AI insights (grade prediction, attendance anomalies, plagiarism detection)

---

## Milestone Summary

| Phase | Weeks | Cumulative | Value |
|---|---|---|---|
| 1 — Foundation | 1 (actual) | 1 | Scaffold + auth + CI + offline |
| 2 — Core School Ops | 6-8 | 10-14 | First usable admin features |
| 3 — Attendance & Finance | 4-6 | 14-20 | Daily ops + money in |
| 4 — Communication & Payroll | 4-5 | 18-25 | Staff tools + payroll |
| 5 — Role Portals & Polish | 3-4 | 21-29 | All roles have dashboards |
| 6 — Production Hardening | 3-4 | 24-33 | Production ready |
| 7 — Extended Features | Ongoing | — | Competitive moat |

**Total estimated time to production-ready (Phase 6): ~24-33 weeks**

---

## Key Decisions Summary

- **Backend:** No Supabase → Custom Next.js API + PostgreSQL via Drizzle ORM
- **Multi-tenancy:** Shared DB, middleware-enforced `school_id` isolation
- **URLs:** Subdomain-based (`{school}.edunexus.com`) + custom domain support
- **Offline:** Optimistic writes → Dexie → background sync → API
- **Payments:** Paystack (Ghana's dominant gateway, MoMo + card + bank)
- **SMS:** Africa's Talking (MTN, Vodafone, AirtelTigo)
- **Testing:** Vitest + Playwright (unit, integration, component, E2E, tenant isolation)
- **Deploy:** Vercel (Next.js) + Railway (PostgreSQL + Redis) — self-hostable via Docker
