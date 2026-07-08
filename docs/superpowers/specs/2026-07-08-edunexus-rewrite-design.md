# EduNexus Rewrite — Design Document

**Date:** 2026-07-08
**Status:** Draft for review
**Product:** EduNexus — Multi-tenant K-12 School Management System
**Target Market:** Ghana & West Africa, configurable for British/American curricula
**Current Codebase:** React 19 + Supabase (JS) — to be rewritten to Next.js 15 + PostgreSQL (TypeScript)

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Tech Stack](#2-tech-stack)
3. [Multi-Tenancy Architecture](#3-multi-tenancy-architecture)
4. [RBAC & Auth](#4-rbac--auth)
5. [Directory Structure](#5-directory-structure)
6. [Database (Drizzle ORM)](#6-database-drizzle-orm)
7. [Feature Phasing](#7-feature-phasing)
8. [Offline Strategy](#8-offline-strategy)
9. [Testing Strategy](#9-testing-strategy)
10. [Dev Environment](#10-dev-environment)
11. [Deploy Strategy](#11-deploy-strategy)
12. [Risks & Mitigations](#12-risks--mitigations)

---

## 1. Motivation

The current EduNexus codebase was AI-scaffolded and relies on Supabase as its backend (Auth, Database, Storage, Realtime, Edge Functions).

**Problems with current approach:**
- **Vendor lock-in** — Deep coupling to Supabase-specific features (Edge Functions, Realtime, RLS policies in SQL). Migrating away would require a full rewrite anyway.
- **No TypeScript** — Current codebase is plain JS. At 100+ source files, this is already producing runtime errors that TS would catch.
- **Scaling concerns** — Supabase's free/pro tier pricing becomes expensive at hundreds of schools. Self-hosting Supabase is complex and resource-heavy.
- **No testing** — Zero test files. Critical financial calculations (Ghana payroll, fee aggregation) have no automated verification.
- **Multi-tenancy is naive** — RLS policies exist but there's no middleware-level tenant enforcement. A bug in any query could leak data across schools.

**Rewrite goals:**
1. Full TypeScript across the stack
2. Self-hostable architecture (no vendor lock-in)
3. Proper multi-tenant isolation at the middleware + ORM layer
4. Offline-first for Ghana's variable internet connectivity
5. Comprehensive test coverage for financial and academic calculations
6. Phased delivery — working features early, not a big-bang rewrite

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Full-stack, middleware for tenant resolution, SSR, file-based routing, Vercel-deployable or self-hosted |
| Language | **TypeScript** (strict mode) | Type safety across entire stack — eliminates an entire class of bugs |
| Database ORM | **Drizzle ORM** | Lighter than Prisma, SQL-like API, better performance for complex queries, excellent migration tooling |
| Database | **PostgreSQL 17** | ACID-compliant, mature, best for financial/academic data, great with Drizzle |
| Auth | **Auth.js v5** | Next.js-native, supports email/password + magic links + OAuth, built-in session management |
| Real-time | **WebSockets** (`ws`) + optional Redis Pub/Sub | Attendance marking, messaging, notifications — only when needed, not always-on polling |
| Offline | **Dexie** (IndexedDB) — keep existing | Already battle-tested in current app. Maintain same sync pattern. |
| File Storage | **S3-compatible** (MinIO dev / Backblaze B2 or AWS S3 prod) | Cheap, scalable, zero lock-in. Cloudflare R2 is a future option. |
| Queue | **BullMQ** (Redis-backed) | Payroll runs, SMS dispatch, fee reminders, report generation |
| Payments | **Paystack API** | Ghana's dominant payment gateway, built-in MoMo support |
| Email | **Resend API** | Transactional email (receipts, notifications, payslips) |
| SMS | **Africa's Talking API** | Ghana networks: MTN, Vodafone, AirtelTigo |
| UI Framework | **shadcn/ui** (Radix primitives) | Already in use, accessible, customizable, great DX |
| Charts | **Recharts** | Already in use, React-native, good enough for school dashboards |
| Forms | **react-hook-form** + **zod** | Already using react-hook-form; replace yup with zod for TS-native validation |
| Tables | **TanStack Table v8** | Already in use |
| PDF | **jsPDF** + **jsPDF-AutoTable** | Already in use for report cards and payslips |
| Deployment | **Vercel** (Next.js) + **Railway/Fly.io** (DB, Redis, services) | Minimal ops overhead, auto-scaling |
| Monorepo | **Turborepo** | Shared types, database package, utilities across apps |

### Why not...

| Technology | Reason for not choosing |
|---|---|
| **tRPC** | Adds complexity for a CRUD-heavy app. REST with Drizzle is simpler and more transparent. |
| **GraphQL** | Overkill for this domain. School management is predominantly list/detail CRUD with some reporting. |
| **Prisma** | Heavier than Drizzle, slower for complex queries, more magic. Drizzle's SQL-like API is easier to audit for school financial data. |
| **NextAuth v4** | v5 (Auth.js) is the future, better TypeScript support, more providers. |
| **Pure Edge Functions** | Cold starts on Vercel Edge are problematic for database-heavy school pages. Node.js runtime is the right default. |

---

## 3. Multi-Tenancy Architecture

### Model: Shared Database with Row-Level Tenant Isolation

Three approaches were evaluated:

| Approach | Isolation Level | Complexity | Scalability | Verdict |
|---|---|---|---|---|
| **Shared DB, row-level** | `school_id` on every table | Medium | Good (up to 10K+ schools) | **Chosen** |
| Schema-per-tenant | Separate PG schema per school | High | Excellent | Overkill; managing N schemas is operational hell |
| DB-per-tenant | Separate database per school | Very High | Excellent | Cost-prohibitive for hundreds of small schools |

**Chosen: Shared PostgreSQL database with disciplined `school_id` scoping on every query.**

### Tenant Resolution Flow

```
Request → Next.js Middleware (middleware.ts)
  │
  ├── 1. Parse hostname from request headers
  │     e.g., "academy.edunexus.com" or "console.edunexus.com"
  │
  ├── 2. Check Redis cache for tenant mapping
  │     Key:   "tenant:academy.edunexus.com"
  │     Value: { school_id: "uuid", name: "Accra Academy", slug: "academy" }
  │     TTL:   3600s (1 hour)
  │
  ├── 3. Cache miss → Query PostgreSQL
  │     SELECT * FROM schools WHERE domain = 'academy.edunexus.com'
  │     → Write result to Redis cache → proceed
  │
  ├── 4. Validate domain
  │     ├── console.edunexus.com → super_admin routes
  │     ├── *.edunexus.com       → school routes (resolve tenant)
  │     ├── custom domain        → look up by domain in schools table
  │     └── unknown domain       → 404 or redirect to console
  │
  └── 5. Attach tenant context to Next.js headers
        x-tenant-id: school_id
        x-tenant-slug: academy
        x-tenant-role-context: super_admin | school
```

### URL Strategy

| URL Pattern | Purpose |
|---|---|
| `console.edunexus.com` | Super admin portal, login landing, registration |
| `{school-slug}.edunexus.com` | Per-school portal (e.g., `academy.edunexus.com`) |
| Custom domain (Phase 2) | e.g., `portal.academy.edu.gh` |

### Tenant Isolation Rules (Enforced at 3 layers)

**Layer 1 — Middleware (mandatory):**
- Every request to a school route must have a resolved `school_id`
- Requests to `console.edunexus.com` bypass school scoping
- The middleware sets `x-tenant-id` header that downstream code reads

**Layer 2 — API Routes & Server Components (defense in depth):**
- Read `school_id` from the middleware-set header, never from client-provided request body
- All database queries use a Drizzle helper that auto-injects `WHERE school_id = ?`

```typescript
// lib/db/tenant-queries.ts
import { db } from './client'
import { students } from './schema'
import { eq, and } from 'drizzle-orm'

export function getTenantQuery(tenantId: string) {
  return {
    students: {
      findAll: () => db.select().from(students).where(eq(students.school_id, tenantId)),
      findById: (id: string) => db.select().from(students).where(
        and(eq(students.id, id), eq(students.school_id, tenantId))
      ).limit(1),
      // ... etc
    }
  }
}
```

**Layer 3 — Database Indexes:**
- Every query pattern has a composite index starting with `school_id`
- Physical data isolation at the query planner level

---

## 4. RBAC & Auth

### Roles

| Role | Scope | Routes | school_id |
|---|---|---|---|
| `super_admin` | Platform-wide | `/(super-admin)/*` | `null` |
| `admin` | Single school | `/(school)/admin/*` | Set |
| `teacher` | Single school | `/(school)/teacher/*` | Set |
| `student` | Single school | `/(school)/student/*` | Set |
| `parent` | Single school | `/(school)/parent/*` | Set |

### Auth Flow

```
1. User visits school subdomain (e.g., academy.edunexus.com)
2. Next.js middleware checks session cookie
3. No session → redirect to console.edunexus.com/login
4. User logs in via Auth.js (email/password or magic link)
5. Auth.js callback:
   a. Looks up user's profile → gets role + school_id
   b. Redirects to appropriate subdomain + route
   c. e.g., admin → academy.edunexus.com/admin/dashboard
6. Subsequent requests: middleware validates
   a. Session is valid (Auth.js)
   b. Role matches route group
   c. School_id matches domain
```

### Session Contents (Auth.js JWT)

```typescript
interface Session {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent'
  schoolId: string | null  // null for super_admin
  schoolSlug: string | null
}
```

### Route Protection Strategy

**Middleware-level (first line of defense):**
```typescript
// middleware.ts
const roleRouteMap = {
  '/(super-admin)/*': ['super_admin'],
  '/(school)/admin/*': ['admin'],
  '/(school)/teacher/*': ['teacher'],
  '/(school)/student/*': ['student'],
  '/(school)/parent/*': ['parent'],
}

export async function middleware(request: NextRequest) {
  const tenant = await resolveTenant(request)
  const session = await auth()  // Auth.js

  if (!session) return redirectToLogin(request)
  if (!validateRoleAccess(session, request.nextUrl.pathname)) return redirectToDashboard(session)
  if (tenant.isSchool && session.schoolId !== tenant.schoolId) return redirectToDashboard(session)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenant.schoolId || '')
  requestHeaders.set('x-tenant-slug', tenant.slug || '')

  return NextResponse.next({ request: { headers: requestHeaders } })
}
```

**API-level (second line of defense):**
```typescript
// lib/auth/api-guard.ts
export function requireRole(...roles: string[]) {
  return (handler: RouteHandler) => async (req: NextRequest) => {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
    if (!roles.includes(session.role)) return new Response('Forbidden', { status: 403 })
    return handler(req)
  }
}
```

---

## 5. Directory Structure

```
edunexus/
├── apps/
│   └── web/                          # Next.js 15 application
│       ├── app/
│       │   ├── (auth)/               # Login, register, forgot-password
│       │   │   ├── login/
│       │   │   ├── register/
│       │   │   └── forgot-password/
│       │   ├── (super-admin)/         # Super admin routes
│       │   │   ├── dashboard/
│       │   │   ├── schools/
│       │   │   ├── users/
│       │   │   └── audit-log/
│       │   ├── (school)/              # Tenant-scoped routes
│       │   │   ├── admin/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── students/
│       │   │   │   ├── staff/
│       │   │   │   ├── classes/
│       │   │   │   ├── academics/
│       │   │   │   ├── attendance/
│       │   │   │   ├── finance/
│       │   │   │   ├── payroll/
│       │   │   │   ├── messaging/
│       │   │   │   ├── reports/
│       │   │   │   └── settings/
│       │   │   ├── teacher/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── attendance/
│       │   │   │   ├── grades/
│       │   │   │   └── messaging/
│       │   │   ├── student/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── schedule/
│       │   │   │   ├── grades/
│       │   │   │   ├── fees/
│       │   │   │   └── library/
│       │   │   └── parent/
│       │   │       ├── dashboard/
│       │   │       ├── children/
│       │   │       ├── payments/
│       │   │       └── messages/
│       │   └── api/                   # API route handlers
│       │       ├── auth/
│       │       ├── schools/
│       │       ├── students/
│       │       ├── staff/
│       │       ├── attendance/
│       │       ├── assessments/
│       │       ├── fees/
│       │       ├── payments/
│       │       └── ...
│       ├── components/
│       │   ├── ui/                    # shadcn/ui primitives
│       │   ├── layouts/               # App layouts
│       │   └── features/              # Feature components (grouped by domain)
│       │       ├── students/
│       │       ├── attendance/
│       │       ├── finance/
│       │       └── ...
│       ├── lib/
│       │   ├── db/
│       │   │   ├── client.ts          # Drizzle client instance
│       │   │   ├── schema/            # Drizzle schema definitions
│       │   │   │   ├── index.ts       # Re-export all
│       │   │   │   ├── schools.ts
│       │   │   │   ├── profiles.ts
│       │   │   │   ├── students.ts
│       │   │   │   ├── staff.ts
│       │   │   │   ├── classes.ts
│       │   │   │   ├── attendance.ts
│       │   │   │   ├── assessments.ts
│       │   │   │   ├── fees.ts
│       │   │   │   ├── payroll.ts
│       │   │   │   └── ...
│       │   │   ├── queries/           # Reusable query builders
│       │   │   │   ├── tenant-scoped.ts  # Auto-injects school_id
│       │   │   │   └── ...
│       │   │   └── migrations/        # Drizzle Kit migrations
│       │   ├── auth/
│       │   │   ├── auth.config.ts     # Auth.js configuration
│       │   │   ├── auth.guard.ts      # Route protection helpers
│       │   │   └── auth.utils.ts      # Session helpers
│       │   ├── tenant/
│       │   │   ├── resolve.ts         # Domain → school_id resolution
│       │   │   ├── cache.ts           # Redis tenant cache
│       │   │   └── context.ts         # React context / header accessor
│       │   └── utils/
│       │       ├── cn.ts              # clsx + tailwind-merge
│       │       ├── formatters.ts      # GHS, dates, grades, phone numbers
│       │       ├── constants.ts       # Shared constants
│       │       └── ghana-payroll.ts   # SSNIT + PAYE calculations
│       ├── hooks/                     # React hooks (TanStack Query)
│       │   ├── use-students.ts
│       │   ├── use-attendance.ts
│       │   ├── use-fees.ts
│       │   └── ...
│       ├── store/                     # Zustand stores
│       │   ├── ui-store.ts
│       │   └── school-store.ts
│       ├── services/                  # External API wrappers
│       │   ├── paystack.ts
│       │   ├── resend.ts
│       │   ├── africas-talking.ts
│       │   └── storage.ts
│       ├── dexie/                     # Offline DB (IndexedDB)
│       │   ├── schema.ts
│       │   ├── sync-service.ts
│       │   └── stores/               # Dexie-backed stores
│       ├── middleware.ts              # Tenant resolution + auth guard
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared/                        # Shared types, constants, utilities
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── school.ts
│   │   │   ├── student.ts
│   │   │   ├── attendance.ts
│   │   │   └── ...
│   │   ├── constants/
│   │   │   ├── roles.ts
│   │   │   ├── grades.ts
│   │   │   └── ghana.ts
│   │   └── utils/
│   │       ├── ghana-payroll.ts
│   │       ├── grade-utils.ts
│   │       └── formatters.ts
│   └── database/                      # Drizzle schema + migrations
│       ├── src/
│       │   ├── schema/
│       │   ├── seed.ts
│       │   └── index.ts
│       ├── drizzle.config.ts
│       ├── migrations/
│       └── package.json
├── docker-compose.yml                 # PostgreSQL + Redis + MinIO + Mailpit
├── turbo.json                         # Turborepo configuration
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint, typecheck, test
│       └── deploy.yml                 # Vercel deploy
├── .env.example
├── .gitignore
├── package.json                       # Workspace root
└── README.md
```

---

## 6. Database (Drizzle ORM)

### Schema Strategy

The current PostgreSQL schema is fundamentally sound — it covers all domains comprehensively. The rewrite migrates all existing tables to Drizzle ORM schema definitions with the following changes:

**Keep (migrate to Drizzle):**
- `schools` — Add `domain` and `custom_domain` columns for tenant resolution
- `profiles` — No changes
- `students` — Add `deleted_at` for soft delete
- `staff` — Add `deleted_at`
- `grade_levels` — No changes
- `classes` — No changes
- `subjects` — No changes
- `class_subjects` — No changes
- `timetable_slots` — No changes
- `assessment_types` — No changes
- `assessments` — No changes
- `assessment_scores` — No changes
- `report_cards` — No changes
- `attendance` — No changes
- `staff_attendance` — No changes
- `fee_categories` — No changes
- `fee_schedules` — No changes
- `student_fees` — No changes
- `payments` — No changes
- `expenses` — No changes
- `payroll_runs` — No changes
- `payslips` — No changes
- `books` — No changes
- `book_loans` — No changes
- `announcements` — No changes
- `messages` — No changes
- `notifications` — No changes
- `vehicles` — No changes
- `routes` — No changes
- `student_transport` — No changes
- `inventory_items` — No changes
- `inventory_transactions` — No changes
- `behavior_records` — No changes
- `wellness_checkins` — No changes
- `parent_engagements` — No changes
- `lesson_plans` — No changes
- `guardians` — No changes
- `student_guardians` — No changes

**Add (new tables):**
- `audit_logs` — `(id, school_id, user_id, action, table_name, record_id, old_data JSONB, new_data JSONB, ip_address, user_agent, created_at)`
- `school_plans` — `(id, school_id, plan_tier, features TEXT[], max_students, max_staff, price, billing_cycle, status, started_at, next_billing_at)`
- `api_keys` — `(id, school_id, key_hash, name, permissions TEXT[], expires_at, last_used_at, created_at)`
- `leave_requests` — `(id, school_id, staff_id, leave_type, start_date, end_date, reason, status, approved_by, created_at)`
- `sync_log` — `(id, school_id, device_id, table_name, last_synced_at, records_pushed, records_pulled)`

**Remove:**
- No tables removed. The schema is comprehensive and correct.

### Indexing Strategy

```sql
-- High-traffic queries
CREATE INDEX idx_students_school_status ON students (school_id, status);
CREATE INDEX idx_staff_school_role ON staff (school_id, role);
CREATE INDEX idx_classes_school_year ON classes (school_id, academic_year_id);
CREATE INDEX idx_attendance_school_date ON attendance (school_id, date);
CREATE INDEX idx_attendance_student_date ON attendance (student_id, date);
CREATE INDEX idx_assessments_term ON assessments (class_subject_id, term_id);
CREATE INDEX idx_scores_assessment ON assessment_scores (assessment_id);
CREATE INDEX idx_payments_school_date ON payments (school_id, payment_date DESC);
CREATE INDEX idx_student_fees_status ON student_fees (student_id, status);
CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_messages_school ON messages (school_id, created_at DESC);
CREATE INDEX idx_audit_logs_school ON audit_logs (school_id, created_at DESC);

-- Full-text search
CREATE INDEX idx_students_name_search ON students USING gin (to_tsvector('simple', first_name || ' ' || last_name));
CREATE INDEX idx_books_title_search ON books USING gin (to_tsvector('english', title));
```

### Migration Pipeline

```bash
# Generate migration after schema change
pnpm drizzle-kit generate

# Apply migration to dev
pnpm drizzle-kit migrate

# Apply to production
pnpm drizzle-kit migrate --config=drizzle.prod.config.ts
```

All migrations are version-controlled in `packages/database/migrations/`.

---

## 7. Feature Phasing

### Phase 1 — Foundation (4-6 weeks)

**Goal:** A deployable full-stack scaffold with auth and tenant isolation.

| Deliverable | Details |
|---|---|
| Monorepo setup | Turborepo, pnpm workspaces, shared tsconfig |
| Next.js 15 scaffold | App Router, TypeScript strict mode |
| Drizzle schema + migrations | All tables from current schema, plus new ones |
| Docker dev environment | PostgreSQL 17 + Redis 7 + MinIO + Mailpit |
| Multi-tenant middleware | Subdomain → school_id resolution with Redis cache |
| Auth.js integration | Email/password + magic link, JWT sessions |
| Role-based route protection | Middleware + API guards for all 5 roles |
| Dexie sync service | Offline schema + background sync worker |
| CI pipeline | GitHub Actions: lint, typecheck, test |
| Seed script | Demo school with sample data |

**Files created:** ~40-50 (config, schema, middleware, auth, CI, Docker, seed)

### Phase 2 — Core School Ops (6-8 weeks)

**Goal:** Admin can manage students, staff, classes, subjects, and scheduling.

| Deliverable | Details |
|---|---|
| Students CRUD | List with DataTable (search, sort, paginate), detail with profile tabs, new/edit form with photo upload |
| Bulk student import | Excel/CSV template upload with validation |
| Student QR codes | Auto-generated QR per student profile |
| Staff CRUD | List with filters, detail with tabs, new/edit form |
| Leave management | Request, approve/reject, balance tracking |
| Classes & Subjects | CRUD, class teacher assignment, roster view |
| Academic Years & Terms | CRUD, set current term (single source of truth) |
| Timetable builder | Drag-drop grid (days × periods), conflict detection, PDF export |
| Assessments | Create, score entry grid, weighted averages, grade distribution |
| Report Cards | Batch generation per class/term, Ghana format, PDF, lock after finalization |

**Files created:** ~60-70 (pages, API routes, hooks, components, services)

### Phase 3 — Attendance & Finance (4-6 weeks)

**Goal:** Daily operations — attendance tracking and fee management.

| Deliverable | Details |
|---|---|
| Teacher attendance | Card grid (tap to toggle Present/Absent/Late/Excused), real-time updates |
| Admin attendance | View/edit any class/date, override lock, bulk mark |
| Attendance reports | Per student (term summary), per class (daily), date range |
| Attendance heatmap | GitHub-style calendar heatmap per student |
| Parent SMS alerts | Auto-notify when student marked Absent (opt-in) |
| Fee categories | CRUD with description and recurring flag |
| Fee schedules | Per grade level per term, auto-generate student_fees on term start |
| Fee waivers | Partial or full with reason, sibling discounts |
| Payment recording | Cash, MoMo (auto-detect network), bank transfer |
| Paystack integration | Online payments: card + MoMo + bank |
| Receipt generation | PDF with school logo, receipt number, QR code |
| Financial reports | Daily collection, term summary, outstanding debtors |

**Files created:** ~40-50

### Phase 4 — Communication & Payroll (4-5 weeks)

**Goal:** Staff communication and payroll processing.

| Deliverable | Details |
|---|---|
| In-app notifications | Real-time bell icon, read/unread, action URLs |
| Announcements | Create, target by role/class, priority levels |
| Internal messaging | Compose, inbox, sent, threads |
| SMS integration | Africa's Talking, template system, delivery reports |
| Email integration | Resend for receipts, payslips, notifications |
| Payroll runs | Monthly: draft → approve → process workflow |
| Auto-calculations | Basic + allowances + SSNIT (5.5% / 13%) + PAYE = net |
| Payslip PDF | School letterhead, full deduction breakdown |
| Payroll reports | Cost by department, average by role, SSNIT summary |
| P9 data export | For tax filing |

**Files created:** ~30-40

### Phase 5 — Role Portals & Polish (3-4 weeks)

**Goal:** Every user role gets a tailored experience.

| Deliverable | Details |
|---|---|
| Super admin console | Dashboard, school CRUD, user management, audit log viewer |
| Teacher dashboard | My classes today, pending assessments, lesson plans due |
| Student dashboard | Today's schedule, recent grades, outstanding fees, library |
| Parent dashboard | Children's attendance, grades, report cards, pay fees |
| Reports & analytics hub | Academic, financial, attendance — all in one place |
| Settings pages | School profile, curriculum, grading, academic calendar |

**Files created:** ~30-40

### Phase 6 — Production Hardening (3-4 weeks)

**Goal:** Production-ready reliability, performance, and security.

| Deliverable | Details |
|---|---|
| Error monitoring | Sentry integration (frontend + backend) |
| Rate limiting | Vercel WAF or custom middleware |
| Security headers | CSP, HSTS, X-Frame-Options, etc. |
| Automated backups | PostgreSQL pg_dump to S3 (daily) + WAL archiving |
| PWA | Service worker, manifest, offline page, install prompt |
| Performance | React Compiler, image optimization, ISR for static pages, caching strategy |
| Documentation | README, deploy guide, admin manual, API reference |
| Load testing | k6 scripts for critical flows (login, attendance, report cards) |

**Files created:** ~15-20

### Phase 7 — Extended Features (ongoing)

**Goal:** Differentiation and innovation.

| Deliverable | Priority |
|---|---|
| Library management (catalog, loans, fines) | Medium |
| Transport management (fleet, routes, manifests, GPS) | Medium |
| Inventory & procurement | Low |
| Behavior gamification (points, badges, leaderboards) | Low |
| Wellness check-ins (mood tracking, flagging) | Low |
| AI insights (grade prediction, attendance patterns) | Low |
| Mobile apps (React Native) | Future |

---

## 8. Offline Strategy

### Architecture

The system uses an **optimistic write with background sync** pattern — the same proven approach from the current codebase.

```
User Action → Dexie (local) → UI updates immediately
                    ↓
            Sync Queue (Dexie table)
                    ↓
            Background Sync Worker
                    ↓
            API (when online) → PostgreSQL
                    ↓
            Update syncStatus → UI reflects
```

### Dexie Schema (keep current, adapt types)

```typescript
// dexie/schema.ts
import Dexie from 'dexie'

const db = new Dexie('EduNexusV2')

db.version(1).stores({
  students:          '++localId, id, school_id, status, current_class_id, syncStatus',
  staff:             '++localId, id, school_id, role, syncStatus',
  classes:           '++localId, id, school_id, grade_level_id, syncStatus',
  attendance:        '++localId, id, student_id, date, syncStatus',
  assessment_scores: '++localId, id, assessment_id, student_id, syncStatus',
  payments:          '++localId, id, student_id, syncStatus',
  announcements:     '++localId, id, school_id, syncStatus',
  notifications:     '++localId, id, user_id, is_read',
  syncQueue:         '++id, table, operation, createdAt, attempts, status',
  cachedQueries:     'queryKey, data, cachedAt',
})
```

### Sync Service

```typescript
// dexie/sync-service.ts
export class SyncService {
  private queue: typeof db.syncQueue

  async enqueue(operation: SyncOperation) {
    await db.syncQueue.add({
      ...operation,
      createdAt: new Date(),
      attempts: 0,
      status: 'pending',
    })
    this.processQueue()
  }

  async processQueue() {
    if (!navigator.onLine) return

    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .limit(50)
      .toArray()

    for (const item of pending) {
      try {
        await this.executeOperation(item)
        await db.syncQueue.delete(item.id)
      } catch (error) {
        await db.syncQueue.update(item.id, {
          attempts: item.attempts + 1,
          status: item.attempts >= 3 ? 'failed' : 'pending',
          lastError: error.message,
        })
      }
    }
  }
}
```

### Conflict Resolution

- **Strategy:** Last-write-wins with server timestamp comparison
- **Edge case:** If two users edit the same record offline, the last one to sync wins
- **Admin override:** Admin UI shows sync conflicts with option to choose which version to keep
- **Audit trail:** All sync operations are logged

---

## 9. Testing Strategy

| Layer | Tool | Targets |
|---|---|---|
| Unit | **Vitest** | GhanaPayroll calculations, gradeUtils, formatters, cn, validation schemas |
| Integration | **Vitest** + **Supertest** | All API route handlers, Drizzle queries, auth flow |
| Component | **Vitest** + **React Testing Library** | UI components, forms with react-hook-form, DataTable |
| E2E | **Playwright** | Critical user journeys (see below) |
| Tenant isolation | **Vitest** with test DB | Verify cross-tenant data leaks are impossible |

### Critical E2E Journeys (Playwright)

1. **School admin flow:** Login → Dashboard → Add student → Create class → Assign subjects → Generate timetable
2. **Teacher flow:** Login → Mark attendance → Enter assessment scores → Generate report cards
3. **Finance flow:** Create fee schedule → Record payment → Generate receipt → View financial report
4. **Payroll flow:** Run payroll → Review payslips → Approve → Process → Email payslips
5. **Parent flow:** Login → View child's grades → View fees → Pay online → Download receipt
6. **Super admin flow:** Login → Create school → Provision admin → View audit log → Suspend school
7. **Multi-tenant security:** Verify School A admin cannot access School B data via URL tampering

### Test Infrastructure

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: edunexus_test
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test

  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: edunexus_test
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm exec playwright install
      - run: pnpm e2e
```

---

## 10. Dev Environment

### Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: edunexus_dev
      POSTGRES_USER: edunexus
      POSTGRES_PASSWORD: edunexus_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: edunexus
      MINIO_ROOT_PASSWORD: edunexus_dev
    command: server /data --console-address ":9001"

  mailpit:
    image: axllent/mailpit
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI

volumes:
  pgdata:
```

### Getting Started

```bash
# Clone and install
git clone https://github.com/your-org/edunexus.git
cd edunexus
pnpm install

# Start infrastructure
docker compose up -d

# Copy env file
cp .env.example .env.local

# Run migrations
pnpm --filter database drizzle-kit migrate

# Seed demo data
pnpm --filter database seed

# Start dev server
pnpm dev
# → http://localhost:3000
# → Demo school: http://demo.edunexus.localhost:3000 (via hosts file or local dev proxy)
```

---

## 11. Deploy Strategy

| Service | Hosting | Estimated Monthly Cost | Notes |
|---|---|---|---|
| Next.js | **Vercel Pro** | $20/mo | 3 preview deployments, analytics, ISR |
| PostgreSQL | **Railway** (or Neon) | $15-30/mo | 10GB storage, automated backups |
| Redis | **Upstash** (serverless) | $5-10/mo | Pay per request, free tier for dev |
| File Storage | **Backblaze B2** + Cloudflare CDN | $3-10/mo | Cheap egress, global CDN |
| Email | **Resend** | $0-20/mo | 100K emails free, then pay as you go |
| SMS | **Africa's Talking** | Pay-per-use | ~$0.02-0.05 per SMS in Ghana |
| Monitoring | **Sentry** | $0-26/mo | Free tier for small teams |
| **Total** | | **~$50-120/mo** | Scales with number of schools |

### Alternative: Fully Self-Hosted

```yaml
# docker-compose.prod.yml
services:
  nextjs:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://...
      STORAGE_ENDPOINT: https://s3.example.com
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:17-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
```

Deploy to any VPS ($10-20/mo DigitalOcean droplet) or Kubernetes cluster.

---

## 12. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Offline sync conflicts** | Data loss or inconsistency | Medium | Last-write-wins with timestamps; admin override UI; audit trail |
| **Tenant data leak** | Regulatory/compliance disaster | Low | 3-layer defense: middleware → API guard → Drizzle helper + tests |
| **Vercel cold starts** | Slow page loads | Medium | Serverless functions warmers; use Node.js runtime (not edge) for DB routes |
| **SMS costs at scale** | Operational cost blowout | Medium | Batch messages; template system; parent opt-in; critical alerts only |
| **Paystack webhook failures** | Payment reconciliation issues | Medium | Idempotency keys; webhook retry with exponential backoff; daily reconciliation report |
| **Migration from old DB** | Data loss or corruption during switchover | Medium | Run old and new systems in parallel for one term; export/verify scripts |
| **Team unfamiliarity with Next.js 15** | Slower initial velocity | High | Phase 1 is intentionally just scaffold + auth — gives team time to ramp up |
| **Feature creep during rewrite** | Never ships | High | Strict phase scoping; cut feature requests to Phase 7; ship Phase 1 first |

---

## Appendix A: Migration from Current Codebase

### Strategy: Parallel Run + Cutover

1. **Keep current app running** in production while building new system
2. **Export data** from current Supabase PostgreSQL via `pg_dump`
3. **Transform** to new schema (add domain, audit_logs, etc.)
4. **Import** to new PostgreSQL database
5. **Run in parallel** for one full academic term
6. **Verify data parity** between old and new systems (automated reconciliation)
7. **Cutover** at term break — update DNS, archive old app

### What to Keep from Current Codebase

- **Dexie schema** — works, just needs new API endpoints
- **Ghana utilities** — `ghanaPayroll.js`, `gradeUtils.js`, `formatters.js`, `ghanaCalendar.js` — migrate to TypeScript
- **UI component patterns** — DataTable, StatCard, Sidebar, layout components — rebuild in shadcn/ui + TS
- **SQL schema** — comprehensive, use as reference for Drizzle schema
- **Seed data** — demo school, classes, students, staff

### What to Rebuild from Scratch

- All page components (Next.js App Router pattern is different from current React Router)
- All API/service layers (no more Supabase queries)
- Auth (Auth.js instead of Supabase Auth)
- Real-time (WebSockets instead of Supabase Realtime)
- File uploads (S3 instead of Supabase Storage)
- Migrations (Drizzle Kit instead of manual SQL files)

---

## Appendix B: Ghana-Specific Features (Preserved)

All Ghana-localized features from the current codebase are carried forward:

- **Ghana Academic Calendar** — 3 terms (Sep-Dec, Jan-Apr, Apr-Aug)
- **Ghana Grade Levels** — Crèche → JHS 3 (Basic) / SHS 1-3 (WASSCE)
- **Ghana Basic Grading** — Grade 1-6 with assessment weighting (Class Exercise 20%, Group 10%, Project 10%, Homework 10%, Exam 50%)
- **WASSCE Grading** — A1-F9 with points system
- **SSNIT Contributions** — Employee 5.5%, Employer 13%
- **Ghana PAYE Tax Bands** — 2024/2025 rates with annual bands
- **Mobile Money** — MTN, Vodafone, AirtelTigo with auto-network detection
- **Currency** — GHS (Ghana Cedis) with ₵ formatting
- **Locale** — en-GH date/number formatting

---

## Appendix C: Key Design Decisions

### Why Drizzle over Prisma?

Drizzle's SQL-like API is more transparent — you write queries that look like SQL, and you can see exactly what SQL will be generated. For a school management system with complex financial queries, this auditability is critical. Drizzle is also significantly faster and has a smaller bundle size.

### Why Auth.js over Supabase Auth?

Supabase Auth is excellent but tightly couples you to Supabase. Auth.js is framework-agnostic, supports 75+ providers, and stores sessions however you want (JWT, database, Redis). It's the standard for Next.js authentication.

### Why Vercel over self-hosting?

For the first 6-12 months, Vercel eliminates DevOps overhead — preview deployments, analytics, automatic HTTPS, CDN, and scaling. The architecture is designed so you can self-host later without changing code, just by pointing the Docker Compose at production images.

### Why not GraphQL?

School management is primarily CRUD with simple list/detail/report patterns. GraphQL adds complexity (resolvers, fragments, caching) without proportional benefit. REST with Drizzle's query builder gives us everything we need with far less code.

### Why subdomain-based multi-tenancy?

Subdomains (`{school}.edunexus.com`) are the most natural UX for school staff — each school feels like their own portal. They work with Vercel's wildcard domain support, enable per-school SSL, and make cookie isolation straightforward. Custom domain support is a natural extension for larger schools.
