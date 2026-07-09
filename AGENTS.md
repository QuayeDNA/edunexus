# EduNexus — Agent Instructions

## Project Identity

**Product:** EduNexus — Multi-tenant K-12 School Management System
**Target Market:** Ghana & West Africa (configurable for British/American curricula)
**Status:** Rewrite from React 19 + Supabase (JS) → Next.js 15 + PostgreSQL (TypeScript)
**Design Doc:** `docs/superpowers/specs/2026-07-08-edunexus-rewrite-design.md`

## Key Contacts

- **Product decisions:** See design doc above

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict) |
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
| UI Framework | shadcn/ui (Radix primitives) |
| Charts | Recharts |
| Forms | react-hook-form + zod |
| Tables | TanStack Table v8 |
| PDF | jsPDF + jsPDF-AutoTable |
| Deployment | Vercel (Next.js) + Railway (DB/Redis) |
| Monorepo | Turborepo (pnpm workspaces) |

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
- Auth.js v5 for authentication (email/password + magic link)
- Session contains: `user.id`, `user.role`, `user.schoolId` (null for super_admin)
- Middleware validates: auth → role matches route → tenant matches domain
- API routes have a second layer of role validation via `requireRole()` guard
- Super admin write operations (school CRUD, user lifecycle) use elevated privilege

### URL Structure
- `console.edunexus.com` — Super admin portal + login
- `{school-slug}.edunexus.com` — Per-school portal
- Custom domain support — Phase 2

### Code Conventions
- TypeScript strict mode everywhere
- Use `cn()` from `@/lib/utils/cn` for conditional class names
- All monetary values stored as `numeric` in GHS
- All dates stored as ISO 8601 UTC, displayed in `en-GH` locale
- Delete actions must always show a confirmation dialog
- Empty states: icon + heading + description + CTA
- Loading states: skeleton loaders, never full-page spinners

---

## Build Phases

| Phase | Description | Status |
|---|---|---|
| **1 — Foundation** | Next.js scaffold, Drizzle schema, middleware, Auth.js, Docker, CI | ✅ Complete |
| **2 — Core School Ops** | Students, Staff, Classes, Subjects, Timetable, Assessments, Report Cards | ⬜ Pending |
| **3 — Attendance & Finance** | Attendance marking, Fees, Payments, Paystack, Receipts, Financial reports | ⬜ Pending |
| **4 — Communication & Payroll** | Notifications, Messaging, SMS/Email, Payroll, Payslips | ⬜ Pending |
| **5 — Role Portals & Polish** | Super admin, Teacher, Student, Parent dashboards. Reports hub. Settings. | ⬜ Pending |
| **6 — Production Hardening** | Sentry, rate limiting, backups, PWA, performance, docs | ⬜ Pending |
| **7 — Extended Features** | Library, Transport, Inventory, Behavior, AI insights | ⬜ Pending |

---

## Current Working Phase

**Phase 1 — Foundation** is being planned. Do not start implementation until the writing-plans skill has been invoked and the implementation plan is approved.

---

## Lightweight Dev Setup (Windows + WSL)

For users running PostgreSQL directly on Windows (no Docker Desktop):

```bash
# PostgreSQL runs as a Windows service — just verify it's started
pnpm install
pnpm db:migrate    # drizzle-kit push (creates tables)
pnpm db:seed       # seed demo school + data
pnpm dev           # http://localhost:3000
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
2. Read `docs/superpowers/specs/2026-07-08-edunexus-rewrite-design.md` for full spec
3. Check which phase is current
4. Review the most recent git log for context on what was last worked on
5. Read relevant files in the phase you're implementing before writing code
