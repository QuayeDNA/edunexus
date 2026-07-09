# EduNexus — Agent Instructions

## Project Identity

**Product:** EduNexus — Multi-tenant K-12 School Management System
**Target Market:** Ghana & West Africa (configurable for British/American curricula)
**Status:** Next.js 16 + PostgreSQL (TypeScript). Supersedes the original React 19 + Supabase (JS) codebase — the rewrite is complete and the app now ships role-based portals (Phase 2 Super Admin Portal done, Phase 3 next).
**Design Doc:** `docs/superpowers/specs/2026-07-08-edunexus-rewrite-design.md`

## Key Contacts

- **Product decisions:** See design doc above

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, TypeScript strict) |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL 17 |
| Auth | Auth.js v5 (NextAuth) |
| Real-time | WebSockets (`ws`) + optional Redis |
| Offline | Dexie (IndexedDB) |
| File Storage | S3-compatible (MinIO dev, Backblaze B2 / AWS S3 prod) |
| Queue | BullMQ (Redis) |
| Payments | Paystack API |
| Email | Resend API |
| SMS | Africa's Talking API |
| UI Framework | shadcn/ui v4 Nova (Base UI primitives) |
| Charts | Recharts |
| Forms | react-hook-form + zod |
| Tables | TanStack Table v8 |
| PDF | jsPDF + jsPDF-AutoTable |
| Deployment | Vercel (Next.js) + Railway (DB/Redis) |
| Monorepo | Turborepo (pnpm workspaces) |

---

## Repository Structure (Monorepo)

The codebase is a pnpm + Turborepo workspace. Shared logic lives in packages; the app lives in `apps/web`.

| Path | Responsibility |
|---|---|
| `apps/web` | Next.js 16 app (App Router). All pages, `app/api/*` route handlers, `components/`, `hooks/`, `services/`, `lib/`. Imports shared packages via `@/...`. |
| `packages/database` | Drizzle schema (`src/schema/*`), client, migrations, seed. Imported as `@edunexus/database`. |
| `packages/shared` | Shared TypeScript types (`UserRole`, etc.), constants (roles, grades, Ghana), and utilities (payroll, grade, formatters). Imported as `@edunexus/shared`. |
| root | `turbo.json`, pnpm workspace config, GitHub Actions CI (`lint`, `typecheck`, `test`), Docker/dev env. |

**Import conventions:**
- Within `apps/web`: use the `@/` alias (e.g. `@/components/ui`, `@/lib/api`).
- Cross-package: `@edunexus/database` and `@edunexus/shared` (never reach into a package's `src` path directly).
- DB access happens only in API route handlers / Server Components / server scripts — never in client components.

---

## Architecture Rules

### Multi-Tenancy (MANDATORY)
- Shared PostgreSQL database with `school_id` on every tenant-scoped table
- Next.js middleware resolves tenant from subdomain → attaches `x-tenant-id` header
- ALL API routes read `school_id` from middleware-set header, NEVER from client body
- Drizzle query layer uses a helper that auto-injects `WHERE school_id = ?`
- Super admin routes bypass tenant scoping (separate route group)

### Data Layer (MANDATORY)
- Never call the database directly inside React components
- Use Drizzle queries in API route handlers or Server Components
- Wrap all server state in TanStack Query hooks on the client
- Cache critical data in Dexie for offline fallback
- All Dexie records must have `syncStatus: 'pending' | 'synced' | 'error'`

### Auth (MANDATORY)
- Auth.js v5 for authentication (email/password via Credentials provider)
- Credentials authorize function queries profiles DB directly (no fetch to API route)
- Passwords hashed with `scrypt` (64-byte salt + hash), stored as `scrypt:{salt}:{hash}`
- Session contains: `user.id`, `user.role`, `user.schoolId` (null for super_admin)
- Proxy (Next.js 16 replaces `middleware.ts` with `proxy.ts`) validates: auth → role matches route → tenant matches domain
- API routes have a second layer of role validation via `requireRole()` guard
- Super admin write operations (school CRUD, user lifecycle) use elevated privilege
- `profiles.school_id` is nullable — super admins have no school association

### Future Auth Improvements (Phase 2+)
- Password reset flow (email-based)
- Email verification on registration
- Account lockout after N failed attempts
- Session management (view/revoke active sessions)
- Rate limiting on `/api/auth/*` endpoints
- Consider SMS OTP (via Africa's Talking) for parent/student accounts — more natural for Ghana's mobile-first market than OAuth

### URL Structure
- `console.edunexus.com` — Super admin portal + login
- `{school-slug}.edunexus.com` — Per-school portal
- Custom domain support — Phase 2

### Code Conventions
- TypeScript strict mode everywhere
- Use `cn()` from `@/lib/utils` for conditional class names
- All monetary values stored as `numeric` in GHS
- All dates stored as ISO 8601 UTC, displayed in `en-GH` locale
- Delete actions must always show a confirmation dialog
- Empty states: icon + heading + description + CTA
- Loading states: skeleton loaders, never full-page spinners

---

## Build Phases (Role-Based)

| Phase | Description | Status |
|---|---|---|
| **1 — Foundation** | Next.js scaffold, Drizzle schema, proxy, Auth.js, Docker, CI | ✅ Complete |
| **2 — Super Admin Portal** | School CRUD, user lifecycle, billing schema, payment infra, email service, audit logs, shadcn/ui | ✅ Complete |
| **3 — Admin Portal** | Students, Staff, Classes, Subjects, Timetable, Fee setup, Payroll, Reports | ⬜ Pending |
| **4 — Teacher Portal** | Attendance, Assessments, Grades, Report Cards, Lesson Plans | ⬜ Pending |
| **5 — Student Portal** | View timetable, grades, report cards, attendance, fees | ⬜ Pending |
| **6 — Parent Portal** | Children overview, payments (Paystack/MoMo), communication | ⬜ Pending |
| **7 — Design System** | Full design system, animations, responsive, a11y, all UI states | ⬜ Pending |
| **8 — Communication** | Announcements, messaging, SMS/Email, notifications | ⬜ Pending |
| **9 — Production** | Sentry, rate limits, backups, PWA, offline, performance, security | ⬜ Pending |
| **10 — Extended** | Library, Transport, Inventory, Behavior, AI insights | ⬜ Pending |

**Note:** Phases 2+ were restructured from feature-based to role-based in July 2026. See `docs/superpowers/specs/2026-07-09-edunexus-phase-restructure.md` for details.

---

## Current Working Phase

**Phase 2 — Super Admin Portal** is implemented and is currently being verified task-by-task against its acceptance criteria. **Phase 3 — Admin (School) Portal** is next. See `ROADMAP.md` for the full phase map and `docs/superpowers/plans/` for task-level plans.

---

## Lesson Learned (Jul 2026)

Phase 2 was implemented in one large batch — this introduced several type errors, schema mismatches, and component library inconsistencies that had to be fixed post-hoc. **Future phases will be broken down into smaller, verifiable tasks**, each with its own typecheck + test gate before proceeding to the next.

### Small-Task Workflow (all phases going forward)

1. **Write the plan first** — `docs/superpowers/plans/` with task-level granularity
2. **One task at a time** — implement, typecheck, test, then move on
3. **Never batch-implement** across API + UI + schema in a single pass
4. **Use shadcn/ui Nova components only** — no custom wrappers; prefer `Controller` + Nova primitives over `FormField`/`FormItem` pattern
5. **Verify DB schema types** before writing routes (numeric → string, nullability, required fields)
6. **Commit after each working task**, not at phase end

---

## Lightweight Dev Setup (Windows + WSL)

For users running PostgreSQL directly on Windows (no Docker Desktop):

```bash
# PostgreSQL runs as a Windows service — just verify it's started
pnpm install
pnpm db:migrate    # drizzle-kit push (creates tables)
pnpm db:seed       # seed demo school + superadmin data
pnpm dev           # http://localhost:3000
# Login: admin@edunexus.com / Admin@123
```

Redis/MinIO are optional — only needed for BullMQ queues & file uploads (Phase 3+).
When you need them later, install Redis via WSL (`sudo apt install redis`) or use a free Redis Cloud tier.

If using Docker in WSL (not Docker Desktop):
```bash
# Install docker.io inside WSL2, set DOCKER_HOST
sudo apt install docker.io
# Then docker-compose up works without Docker Desktop overhead
```

---

## SQL Conventions

- All tables have `id uuid primary key default gen_random_uuid()`
- All tenant-scoped tables have `school_id uuid references schools(id) not null`
- All tables have `created_at timestamptz default now()`
- Composite indexes on `(school_id, ...)` for all query patterns
- Soft delete via `deleted_at timestamptz` on major tables
- Audit logging on all write operations

---

## Ghana-Specific Non-Negotiables

- Ghana Academic Calendar (3 terms) is default
- Ghana Basic Grading (Grade 1-6) with defined assessment weighting
- SSNIT: Employee 5.5%, Employer 13%
- PAYE: Ghana tax bands with annual calculation
- Mobile Money: MTN, Vodafone, AirtelTigo with auto-network detection
- Currency: GHS (₵)
- Locale: en-GH

---

## Testing

- Unit: Vitest (utilities, calculations)
- Integration: Vitest + Supertest (API routes)
- Component: Vitest + Testing Library (UI components)
- E2E: Playwright (critical user journeys)
- Tenant isolation: Dedicated test suite verifying cross-tenant data isolation

---

## Handoff Notes

When starting a new session working on EduNexus:
1. Read `AGENTS.md` (this file) for project context
2. Read `ROADMAP.md` for the phase map, and `docs/superpowers/specs/2026-07-08-edunexus-rewrite-design.md` for the full spec
3. Check which phase is current
4. Review the most recent git log for context on what was last worked on
5. Read relevant files in the phase you're implementing before writing code
6. Read `docs/superpowers/plans/` for the current phase's task-level plan and acceptance criteria
