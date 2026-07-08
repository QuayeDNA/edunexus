# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deployable full-stack scaffold with auth, multi-tenant isolation, and offline support.

**Architecture:** Next.js 15 App Router (backend + frontend), PostgreSQL via Drizzle ORM, Auth.js for auth, subdomain-based tenant resolution in middleware, Dexie for offline.

**Tech Stack:** Next.js 15, TypeScript strict, Drizzle ORM, Auth.js v5, PostgreSQL 17, Redis 7, Dexie, Turborepo, pnpm, Docker, Vitest, Playwright

## Global Constraints

- TypeScript strict mode everywhere
- All tenant-scoped tables have `school_id uuid not null` referencing `schools(id)`
- All tables have `id uuid primary key default gen_random_uuid()` and `created_at timestamptz default now()`
- Composite indexes on `(school_id, ...)` for all query patterns
- Soft delete via `deleted_at timestamptz` on students, staff, classes
- Auth.js v5 for authentication (email/password + magic link)
- Session contains: `user.id`, `user.role`, `user.schoolId` (null for super_admin)
- Middleware resolves tenant from subdomain → attaches `x-tenant-id` header
- Monetary values stored as `numeric` in GHS
- Dates stored as ISO 8601 UTC, displayed in `en-GH` locale
- Use `cn()` from `@/lib/utils/cn` for conditional class names
- Ghana Academic Calendar (3 terms) default, Ghana Basic Grading, SSNIT 5.5%/13%, PAYE tax bands
- Mobile Money: MTN, Vodafone, AirtelTigo auto-detection

---

## File Structure

```
edunexus/
├── package.json                          # Workspace root
├── pnpm-workspace.yaml                   # Workspace config
├── turbo.json                            # Turborepo config
├── tsconfig.base.json                    # Base TypeScript config
├── .gitignore
├── .env.example
├── docker-compose.yml                    # PostgreSQL + Redis + MinIO + Mailpit
├── apps/web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── middleware.ts                     # Tenant resolution + auth guard
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (Inter font, providers)
│   │   ├── page.tsx                      # Root → redirect to /login
│   │   ├── globals.css                   # Tailwind CSS
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                # Centered card layout
│   │   │   ├── login/page.tsx            # Login form
│   │   │   ├── register/page.tsx         # School registration (placeholder)
│   │   │   └── forgot-password/page.tsx  # Password reset
│   │   ├── (super-admin)/
│   │   │   ├── layout.tsx                # Super admin sidebar
│   │   │   └── dashboard/page.tsx
│   │   ├── (school)/
│   │   │   ├── layout.tsx                # Passthrough
│   │   │   ├── admin/layout.tsx + dashboard/page.tsx
│   │   │   ├── teacher/layout.tsx + dashboard/page.tsx
│   │   │   ├── student/layout.tsx + dashboard/page.tsx
│   │   │   └── parent/layout.tsx + dashboard/page.tsx
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── ui/                           # shadcn/ui: button, input, label, card, avatar, skeleton, badge
│   │   └── layouts/
│   │       ├── providers.tsx             # SessionProvider, QueryClientProvider
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── auth.config.ts            # NextAuth config + credentials provider
│   │   │   ├── auth.guard.ts             # requireRole() guard
│   │   │   └── auth.utils.ts             # getCurrentUser() helper
│   │   ├── db/client.ts                  # Drizzle client (web)
│   │   ├── tenant/
│   │   │   ├── resolve.ts                # Domain → school_id resolution
│   │   │   └── cache.ts                  # In-memory tenant cache (Redis later)
│   │   └── utils/
│   │       ├── cn.ts                     # clsx + tailwind-merge
│   │       └── constants.ts
│   ├── dexie/
│   │   ├── schema.ts                     # Dexie DB schema
│   │   └── sync-service.ts              # Background sync worker
│   └── hooks/
│       ├── use-session.ts                # Typed session hook
│       └── use-tenant.ts                 # Tenant context hook
├── packages/
│   ├── database/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── client.ts                 # DB connection (shared)
│   │   │   ├── helpers.ts                # tenantQuery() builder
│   │   │   ├── schema/
│   │   │   │   ├── index.ts              # Re-exports
│   │   │   │   ├── schools.ts
│   │   │   │   ├── profiles.ts
│   │   │   │   ├── students.ts
│   │   │   │   ├── staff.ts
│   │   │   │   ├── grade-levels.ts
│   │   │   │   ├── classes.ts
│   │   │   │   ├── subjects.ts
│   │   │   │   ├── class-subjects.ts
│   │   │   │   ├── timetable.ts
│   │   │   │   ├── assessments.ts
│   │   │   │   ├── attendance.ts
│   │   │   │   ├── fees.ts
│   │   │   │   ├── payroll.ts
│   │   │   │   ├── library.ts
│   │   │   │   ├── transport.ts
│   │   │   │   ├── inventory.ts
│   │   │   │   ├── messaging.ts
│   │   │   │   ├── behavior.ts
│   │   │   │   └── audit.ts
│   │   │   └── seed.ts                   # Demo data
│   │   └── migrations/                   # Auto-generated
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # Re-exports
│           ├── types/
│           │   ├── common.ts             # UserRole, Gender, Status enums
│           │   ├── school.ts             # School, AcademicYear, Term
│           │   ├── student.ts            # Student, Guardian
│           │   ├── staff.ts              # Staff
│           │   ├── academics.ts          # GradeLevel, Class, Subject, Assessment, ReportCard
│           │   ├── attendance.ts         # AttendanceRecord, StaffAttendance
│           │   └── finance.ts            # FeeCategory, FeeSchedule, Payment, etc.
│           ├── constants/
│           │   ├── roles.ts              # ROLES, ROLE_ROUTES, ROLE_LABELS
│           │   ├── grades.ts             # All grading scales
│           │   └── ghana.ts              # Calendar, MoMo providers
│           └── utils/
│               ├── ghana-payroll.ts      # SSNIT + PAYE calculations
│               ├── grade-utils.ts        # Grade lookup, weighted avg
│               └── formatters.ts         # GHS, dates, phone, names
├── .github/workflows/
│   ├── ci.yml                            # Lint + typecheck + test
│   └── deploy.yml                        # Vercel deploy
└── tests/
    └── apps/web/lib/utils/
        ├── formatters.test.ts
        ├── ghana-payroll.test.ts
        └── grade-utils.test.ts
```

---

## Tasks

### Task 1: Monorepo Scaffold + Dev Environment

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `docker-compose.yml`

**Interfaces:**
- Produces: Workspace root with pnpm, turbo, Docker services (PostgreSQL 17, Redis 7, MinIO, Mailpit)

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "edunexus",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  },
  "devDependencies": { "turbo": "^2.3.0", "typescript": "^5.7.0" },
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20.0.0" }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": [] }
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "esModuleInterop": true, "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true, "resolveJsonModule": true,
    "isolatedModules": true, "declaration": true, "sourceMap": true
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/, dist/, .next/, .turbo/, *.local, .env.local, coverage/
```

- [ ] **Step 6: Create .env.example**

```
DATABASE_URL="postgres://edunexus:edunexus_dev@localhost:5432/edunexus_dev"
REDIS_URL="redis://localhost:6379"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
STORAGE_ENDPOINT="http://localhost:9000"
STORAGE_ACCESS_KEY="edunexus"
STORAGE_SECRET_KEY="edunexus_dev"
STORAGE_BUCKET="edunexus-dev"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 7: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: edunexus_dev
      POSTGRES_USER: edunexus
      POSTGRES_PASSWORD: edunexus_dev
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U edunexus"], interval: 5s, timeout: 5s, retries: 5 }
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: 5s, timeout: 5s, retries: 5 }
  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: edunexus
      MINIO_ROOT_PASSWORD: edunexus_dev
    command: server /data --console-address ":9001"
    volumes: [miniodata:/data]
  mailpit:
    image: axllent/mailpit:latest
    ports: ["1025:1025", "8025:8025"]
volumes: { pgdata:, miniodata: }
```

- [ ] **Step 8: Run `pnpm install`** — verify creates lockfile

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .env.example docker-compose.yml
git commit -m "phase-1(task-1): scaffold monorepo and dev environment"
```

---

### Task 2: Shared Package — Types, Constants, Ghana Utilities

**Files:** Create `packages/shared/` with types (common, school, student, staff, academics, attendance, finance), constants (roles, grades, ghana), utils (ghana-payroll, grade-utils, formatters)

- [ ] **Step 1: Create `packages/shared/package.json`** with name `@edunexus/shared`, typecheck script

- [ ] **Step 2: Create `packages/shared/tsconfig.json`** extending `../../tsconfig.base.json`

- [ ] **Step 3: Create `src/types/common.ts`** with `UserRole`, `Gender`, `Status`, `EmploymentStatus`, `CurriculumMode`, `CalendarMode`, `GradingSystem`, `PaginationParams`

- [ ] **Step 4: Create `src/types/school.ts`** with `School`, `AcademicYear`, `Term` interfaces (all id : string, timestamps, school_id FK)

- [ ] **Step 5: Create `src/types/student.ts`** with `Student` (all fields from schema) and `Guardian` interfaces

- [ ] **Step 6: Create `src/types/staff.ts`** with `Staff` interface

- [ ] **Step 7: Create `src/types/academics.ts`** with `GradeLevel`, `Class`, `Subject`, `ClassSubject`, `TimetableSlot`, `AssessmentType`, `Assessment`, `AssessmentScore`, `ReportCard`

- [ ] **Step 8: Create `src/types/attendance.ts`** with `AttendanceRecord`, `StaffAttendance`

- [ ] **Step 9: Create `src/types/finance.ts`** with `FeeCategory`, `FeeSchedule`, `StudentFee`, `Payment`, `Expense`

- [ ] **Step 10: Create `src/constants/roles.ts`** — `ROLES`, `ROLE_ROUTES` (maps each role to its dashboard path), `ROLE_LABELS`

- [ ] **Step 11: Create `src/constants/grades.ts`** — `GHANA_BASIC_GRADES` (80-100→1, 70-79→2, 60-69→3, 50-59→4, 40-49→5, 0-39→6), `GHANA_BASIC_WEIGHTS`, `GHANA_WASSCE_GRADES`, `BRITISH_GCSE_GRADES`, `AMERICAN_GPA_GRADES`

- [ ] **Step 12: Create `src/constants/ghana.ts`** — `GHANA_TERMS` (3 terms), `GHANA_GRADE_LEVELS` (Crèche→JHS 3), `MOMO_PROVIDERS` with prefix detection

- [ ] **Step 13: Create `src/utils/ghana-payroll.ts`** — `SSNIT_RATES` (employee 0.055, employer 0.13), `GHANA_PAYE_BANDS` (7 bands), `calculateGhanaPAYE()`, `calculatePayslip()` with PayslipInput → PayslipResult

- [ ] **Step 14: Create `src/utils/grade-utils.ts`** — `getGrade(score, system)`, `calculateWeightedAverage(scores[])`, `calculatePositionInClass()`

- [ ] **Step 15: Create `src/utils/formatters.ts`** — `formatGHS()`, `formatDate()`, `formatPhone()`, `formatName()`

- [ ] **Step 16: Create `src/index.ts`** re-exporting all types, constants, utils

- [ ] **Step 17: Run `pnpm --filter @edunexus/shared typecheck`** — verify no errors

- [ ] **Step 18: Commit**

```bash
git add packages/shared/
git commit -m "phase-1(task-2): create shared types, constants, and Ghana utilities"
```

---

### Task 3: Database Package — Drizzle Schema + Client + Seed

**Files:** Create `packages/database/` with Drizzle schema for all 20+ tables, client, tenant query helpers, seed script

- [ ] **Step 1: Create `package.json`** with deps: `drizzle-orm`, `postgres`, `@edunexus/shared`, devDeps: `drizzle-kit`, `tsx`

- [ ] **Step 2: Create `drizzle.config.ts`** pointing to `./src/schema/index.ts`, output `./migrations`, dialect `postgresql`

- [ ] **Step 3: Create `src/client.ts`** — drizzle(postgres(connectionString), { schema })

- [ ] **Step 4: Create `src/helpers.ts`** — `tenantQuery(qb, table, schoolId)` returning findAll, findById, create, update, delete (all scoped by school_id)

- [ ] **Step 5: Create `src/schema/schools.ts`** — schools, academic_years, terms (school_id FK, timestamps, composite indexes)

- [ ] **Step 6: Create `src/schema/profiles.ts`** — profiles with role enum (super_admin, admin, teacher, student, parent)

- [ ] **Step 7: Create `src/schema/students.ts`** — students, guardians, student_guardians (with soft delete, composite index on school_id + student_id_number)

- [ ] **Step 8: Create `src/schema/staff.ts`** — staff (with soft delete)

- [ ] **Step 9: Create `src/schema/grade-levels.ts`** — grade_levels

- [ ] **Step 10: Create `src/schema/classes.ts`** — classes (FK to grade_levels, academic_years, staff)

- [ ] **Step 11: Create `src/schema/subjects.ts`** — subjects, class_subjects

- [ ] **Step 12: Create `src/schema/timetable.ts`** — timetable_slots

- [ ] **Step 13: Create `src/schema/assessments.ts`** — assessment_types, assessments, assessment_scores, report_cards

- [ ] **Step 14: Create `src/schema/attendance.ts`** — attendance (unique on student_id + date), staff_attendance

- [ ] **Step 15: Create `src/schema/fees.ts`** — fee_categories, fee_schedules, student_fees, payments, expenses

- [ ] **Step 16: Create `src/schema/payroll.ts`** — payroll_runs, payslips

- [ ] **Step 17: Create `src/schema/library.ts`** — books, book_loans

- [ ] **Step 18: Create `src/schema/transport.ts`** — vehicles, routes, student_transport

- [ ] **Step 19: Create `src/schema/inventory.ts`** — inventory_items, inventory_transactions

- [ ] **Step 20: Create `src/schema/messaging.ts`** — announcements, messages, notifications

- [ ] **Step 21: Create `src/schema/behavior.ts`** — behavior_records, wellness_checkins, parent_engagements, lesson_plans

- [ ] **Step 22: Create `src/schema/audit.ts`** — audit_logs (school_id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent)

- [ ] **Step 23: Create `src/schema/index.ts`** re-exporting all table definitions

- [ ] **Step 24: Create `src/seed.ts`** — Create demo school "Accra Academy Basic School" (slug: academy), 1 academic year (2024/2025), 3 terms, 11 grade levels (KG 1 → JHS 3)

- [ ] **Step 25: Run `pnpm --filter @edunexus/database generate && pnpm --filter @edunexus/database migrate`** — verify all tables created

- [ ] **Step 26: Run `pnpm --filter @edunexus/database seed`** — verify seed data inserted

- [ ] **Step 27: Run typecheck** — verify no errors

- [ ] **Step 28: Commit**

```bash
git add packages/database/
git commit -m "phase-1(task-3): create Drizzle ORM schema, client, and seed script"
```

---

### Task 4: Next.js App Scaffold + UI Components

**Files:** Create `apps/web/` with Next.js 15, Tailwind CSS 4, shadcn/ui primitives, providers

- [ ] **Step 1: Create `package.json`** with deps: next, react 19, next-auth, @radix-ui/*, @tanstack/react-query, lucide-react, tailwind-merge, class-variance-authority, clsx, date-fns, @fontsource/inter, zod, zustand, @edunexus/shared, @edunexus/database

- [ ] **Step 2: Create `tsconfig.json`** extending base, jsx: preserve, paths alias `@/*` → `./*`

- [ ] **Step 3: Create `next.config.ts`** — transpilePackages for @edunexus/shared, @edunexus/database

- [ ] **Step 4: Create `tailwind.config.ts`** — brand colors (indigo), accent (emerald), surface, border, text, status colors, Inter font

- [ ] **Step 5: Create `postcss.config.mjs`** — tailwindcss + autoprefixer

- [ ] **Step 6: Create `app/globals.css`** — @tailwind base/components/utilities, base layer with border-border, surface-muted bg, Inter font, antialiased

- [ ] **Step 7: Create `lib/utils/cn.ts`** — cn() using clsx + tailwind-merge

- [ ] **Step 8: Create `lib/utils/constants.ts`** — re-export ROLES, ROLE_ROUTES from @edunexus/shared, APP_NAME, APP_TAGLINE

- [ ] **Step 9: Create `lib/db/client.ts`** — Drizzle client with connection string from env

- [ ] **Step 10: Create `components/layouts/providers.tsx`** — SessionProvider + QueryClientProvider (client component)

- [ ] **Step 11: Create `app/layout.tsx`** — html (lang en-GH), body, Inter font imports, Providers wrapper

- [ ] **Step 12: Create `app/page.tsx`** — redirect('/login')

- [ ] **Step 13: Create `components/ui/button.tsx`** with variants (default, destructive, outline, secondary, ghost, link) and sizes (default, sm, lg, icon), using cn and cva

- [ ] **Step 14: Create `components/ui/input.tsx`** — styled input with focus ring, placeholder, disabled states

- [ ] **Step 15: Create `components/ui/label.tsx`** — Radix Label wrapper

- [ ] **Step 16: Create `components/ui/card.tsx`** — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

- [ ] **Step 17: Create `components/ui/avatar.tsx`** — Radix Avatar, AvatarImage, AvatarFallback

- [ ] **Step 18: Create `components/ui/skeleton.tsx`** — animate-pulse div

- [ ] **Step 19: Create `components/ui/badge.tsx`** with variants (default, success, warning, danger, info, outline)

- [ ] **Step 20: Run `pnpm dev`** — verify start at localhost:3000, redirects to /login

- [ ] **Step 21: Commit**

```bash
git add apps/web/
git commit -m "phase-1(task-4): scaffold Next.js app with UI components"
```

---

### Task 5: Auth.js Integration

**Files:** Create auth config, API route, login/register/forgot-password pages, session hook

- [ ] **Step 1: Create `lib/auth/auth.config.ts`** — NextAuth with Credentials provider, jwt + session callbacks (role, schoolId in token/session), pages.signIn = '/login'

- [ ] **Step 2: Create `lib/auth/auth.guard.ts`** — requireRole(...roles) async function: awaits auth(), redirects to /login if no session, redirects to / if wrong role

- [ ] **Step 3: Create `lib/auth/auth.utils.ts`** — getCurrentUser() returning AuthUser or null

- [ ] **Step 4: Create `app/api/auth/[...nextauth]/route.ts`** — export GET, POST from handlers

- [ ] **Step 5: Create `app/(auth)/layout.tsx`** — centered card layout (min-h-screen flex items-center justify-center, max-w-sm)

- [ ] **Step 6: Create login page** — client component with email + password inputs, signIn call, error state, loading state, links to register + forgot-password

- [ ] **Step 7: Create register page** — client component with step indicator (5 steps), placeholder "Phase 2" message, back to login link

- [ ] **Step 8: Create forgot-password page** — client component with email input, sent confirmation state

- [ ] **Step 9: Create `hooks/use-session.ts`** — useCurrentUser() returning user, isAuthenticated, isLoading from useSession()

- [ ] **Step 10: Commit**

```bash
git add apps/web/lib/auth/ apps/web/app/api/auth/ apps/web/app/\(auth\)/ apps/web/hooks/use-session.ts
git commit -m "phase-1(task-5): implement Auth.js integration with login page"
```

---

### Task 6: Multi-Tenant Middleware + Route Protection

**Files:** Create middleware, tenant resolution, all role-specific layouts and dashboards

- [ ] **Step 1: Create `lib/tenant/cache.ts`** — in-memory Map with TTL (1 hour), get/set/clear

- [ ] **Step 2: Create `lib/tenant/resolve.ts`** — resolveTenant(hostname): parse subdomain, check cache, query schools by slug, return { schoolId, slug, name, isSuperAdmin }, fallback super_admin for console/unknown

- [ ] **Step 3: Create `middleware.ts`** — matcher excluding static files, resolve tenant → auth check → role route validation → tenant match → set x-tenant-id header

- [ ] **Step 4: Create `app/(super-admin)/layout.tsx`** — requireRole('super_admin'), sidebar nav (Dashboard, Schools, Users, Audit Log), main content area

- [ ] **Step 5: Create dashboard page for super admin** — 3 stat cards (Total Schools, Active Users, Status)

- [ ] **Step 6: Create `app/(school)/layout.tsx`** — passthrough layout (just {children})

- [ ] **Step 7: Create `app/(school)/admin/layout.tsx`** — requireRole('admin'), sidebar nav (Dashboard, Students, Staff, Classes, Academics, Attendance, Finance, Payroll, Messaging, Reports, Settings)

- [ ] **Step 8: Create admin dashboard page** — 4 stat cards (Students, Staff, Classes, Attendance), Quick Actions section

- [ ] **Step 9: Create teacher layout** — requireRole('teacher'), sidebar nav (Dashboard, Attendance, Grades, Messaging)

- [ ] **Step 10: Create teacher dashboard page** — 3 stat cards (My Classes Today, Pending Assessments, Students)

- [ ] **Step 11: Create student layout + dashboard** — requireRole('student'), minimal layout

- [ ] **Step 12: Create parent layout + dashboard** — requireRole('parent'), minimal layout

- [ ] **Step 13: Commit**

```bash
git add middleware.ts apps/web/lib/tenant/ apps/web/app/\(super-admin\)/ apps/web/app/\(school\)/
git commit -m "phase-1(task-6): implement multi-tenant middleware and route protection"
```

---

### Task 7: Dexie Offline Schema + Sync

**Files:** Create Dexie schema and sync service for offline support

- [ ] **Step 1: Create `dexie/schema.ts`** — Dexie database 'EduNexusV2', stores for students, staff, classes, attendance, assessment_scores, payments, announcements, notifications, syncQueue, cachedQueries

- [ ] **Step 2: Create `dexie/sync-service.ts`** — SyncService class with enqueue(operation), processQueue() (process 50 pending items, POST to API, retry up to 3 times), conflict resolution via last-write-wins with server timestamps

- [ ] **Step 3: Commit**

```bash
git add apps/web/dexie/
git commit -m "phase-1(task-7): create Dexie offline schema and sync service"
```

---

### Task 8: CI Pipeline + Initial Tests

**Files:** Create GitHub Actions workflows, Vitest config, unit tests

- [ ] **Step 1: Create `.github/workflows/ci.yml`** — lint (turbo lint), typecheck (turbo typecheck), test (turbo test), PostgreSQL service container, pnpm setup

- [ ] **Step 2: Create `.github/workflows/deploy.yml`** — deploy to Vercel on push to main

- [ ] **Step 3: Create `tests/apps/web/lib/utils/formatters.test.ts`** — test formatGHS(100) returns "GH₵100.00", formatDate, formatPhone("0241234567") returns "024 123 4567"

- [ ] **Step 4: Create `tests/apps/web/lib/utils/ghana-payroll.test.ts`** — test calculatePayslip with salary 2000, verify gross, ssnit_employee (110), ssnit_employer (260), net > 0

- [ ] **Step 5: Create `tests/apps/web/lib/utils/grade-utils.test.ts`** — test getGrade(85) returns grade '1' (Ghana Basic), getGrade gets correct grade for boundary values

- [ ] **Step 6: Add Vitest config to apps/web/**

- [ ] **Step 7: Run tests** — verify all pass

- [ ] **Step 8: Commit**

```bash
git add .github/ tests/ apps/web/vitest.config.ts
git commit -m "phase-1(task-8): add CI pipeline and initial unit tests"
```

---

### Task 9: Final Verification

- [ ] **Step 1: `docker compose up -d`** — start PostgreSQL, Redis, MinIO, Mailpit

- [ ] **Step 2: `pnpm install`** — verify clean install

- [ ] **Step 3: `pnpm --filter @edunexus/database generate && pnpm --filter @edunexus/database migrate`** — verify schema applied

- [ ] **Step 4: `pnpm --filter @edunexus/database seed`** — verify seed

- [ ] **Step 5: `pnpm typecheck`** — all packages pass

- [ ] **Step 6: `pnpm test`** — all tests pass

- [ ] **Step 7: `pnpm dev`** — app starts, login page renders at localhost:3000

- [ ] **Step 8: Final commit** — git add -A && git commit -m "phase-1(task-9): final verification and cleanup"
