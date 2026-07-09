# EduNexus — One platform. Every learner. Every school.

A production-ready, multi-tenant K-12 School Management System for Ghana & West Africa, configurable for British/American curricula.

> **Stack:** Next.js 16 (App Router, Turbopack, TypeScript strict) · PostgreSQL 17 · Drizzle ORM · Auth.js v5 · Turborepo monorepo. Supersedes the original React 19 + Supabase (JS) codebase.

---

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in (see `AGENTS.md` → "Key Conventions" for required vars):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret |
| `RESEND_API_KEY` | Resend transactional email |
| `PAYSTACK_SECRET_KEY` | Paystack payments |
| `AFRICAS_TALKING_API_KEY` | SMS (Phase 8) |

### 3. Set up the database

```bash
pnpm db:migrate   # drizzle-kit push — creates all tables
pnpm db:seed      # seed demo school + super-admin
```

On Windows, PostgreSQL runs as a native service (see `AGENTS.md` → "Lightweight Dev Setup" for the WSL/Docker path).

### 4. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Super admin portal:** `console.edunexus.local` (or `/` when running locally) — `admin@edunexus.com` / `Admin@123`
- **Per-school portal:** `{school-slug}.edunexus.local`

---

## Repository Structure (Monorepo)

The codebase is a pnpm + Turborepo workspace. Shared logic lives in packages; the app lives in `apps/web`.

| Path | Responsibility |
|---|---|
| `apps/web` | Next.js 16 app (App Router). All pages, `app/api/*` route handlers, `components/`, `hooks/`, `services/`, `lib/`. Imports shared packages via `@/...`. |
| `packages/database` | Drizzle schema (`src/schema/*`), client, migrations, seed. Imported as `@edunexus/database`. |
| `packages/shared` | Shared TypeScript types (`UserRole`, etc.), constants (roles, grades, Ghana), utilities (payroll, grade, formatters). Imported as `@edunexus/shared`. |
| root | `turbo.json`, pnpm workspace config, GitHub Actions CI (`lint`, `typecheck`, `test`), Docker/dev env. |

**Import conventions:**
- Within `apps/web`: use the `@/` alias (e.g. `@/components/ui`, `@/lib/api`).
- Cross-package: `@edunexus/database` and `@edunexus/shared` (never reach into a package's `src` path directly).
- DB access happens only in API route handlers / Server Components / server scripts — never in client components.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, TypeScript strict) |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL 17 |
| Auth | Auth.js v5 (Credentials provider, scrypt) |
| Multi-tenancy | Proxy (`proxy.ts`) resolves subdomain → `school_id`; API routes read it via `requireRole()` |
| Real-time | WebSockets (`ws`) + optional Redis |
| Offline | Dexie (IndexedDB) |
| File Storage | S3-compatible (MinIO dev / Backblaze B2 prod) |
| Queue | BullMQ (Redis) |
| Payments | Paystack API (abstract `IPaymentProvider`) |
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

## Access Model

The codebase follows a platform-level access model:

- `super_admin` is a cross-school platform role (`profiles.school_id` is `null`).
- `admin`, `teacher`, `student`, and `parent` are school-scoped roles tied to `profiles.school_id`.
- Super admin write operations (school CRUD, user lifecycle) run server-side via `requireRole('super_admin')` guards on API routes.
- Multi-tenant isolation is enforced in 3 layers: proxy `school_id` header → API `requireRole`/`requireSchool` guard → Drizzle query helper auto-injecting `WHERE school_id = ?`.

### User Hierarchy

| Role | Scope | Primary Responsibility |
|---|---|---|
| `super_admin` | Platform-wide (all schools) | School provisioning, cross-school user lifecycle, platform governance |
| `admin` | Single school | School operations, user administration, settings, reporting |
| `teacher` | Assigned classes/subjects | Attendance, grading, class-level communication |
| `student` | Self | Personal academics, attendance, fees, wellness |
| `parent` | Linked children | Child progress, communication, fee visibility/payments |

---

## Build Phases (Role-Based)

Each phase delivers a complete, working portal for one stakeholder. See `ROADMAP.md` for the full phase map and `docs/superpowers/plans/` for task-level plans.

| Phase | Status | Description |
|---|---|---|
| **1 — Foundation** | ✅ Complete | Next.js scaffold, Drizzle schema, proxy, Auth.js, Docker, CI |
| **2 — Super Admin Portal** | ✅ Complete | School CRUD, user lifecycle, billing schema, payment infra, email service, audit logs, shadcn/ui |
| **3 — Admin (School) Portal** | ⬜ Pending | Students, staff, classes, subjects, timetable, fee setup, payroll, reports |
| **4 — Teacher Portal** | ⬜ Pending | Attendance, assessments, grades, report cards, lesson plans |
| **5 — Student Portal** | ⬜ Pending | View timetable, grades, report cards, attendance, fees |
| **6 — Parent Portal** | ⬜ Pending | Children overview, payments (Paystack/MoMo), communication |
| **7 — Design System & Polish** | ⬜ Pending | Full design system, animations, responsive, a11y, all UI states |
| **8 — Cross-Role Communication** | ⬜ Pending | Announcements, messaging, SMS/Email, notifications |
| **9 — Production Hardening** | ⬜ Pending | Sentry, rate limits, backups, PWA, offline, performance, security |
| **10 — Extended Features** | ⬜ Pending | Library, transport, inventory, behavior, AI insights |

---

## Key Conventions

- Never call the database directly in client components — use Drizzle in API route handlers / Server Components, wrapped in TanStack Query hooks on the client.
- All monetary values stored as `numeric(12,2)` in GHS.
- All dates stored as ISO 8601 UTC, displayed in `en-GH` locale.
- Use `cn()` from `@/lib/utils` for conditional class names.
- Delete actions must always show a confirmation dialog.
- Empty states: icon + heading + description + CTA.
- Loading states: skeleton loaders, never full-page spinners.
- TypeScript strict mode everywhere.
- Commit after each working task, not at phase end.

---

## Supported Curricula

| Mode | Grade Levels | Grading | Calendar |
|---|---|---|---|
| Ghana Basic (default) | Crèche → JHS 3 | Grade 1–6 | 3 terms |
| Ghana SHS (WASSCE) | SHS 1–3 | A1–F9 | 3 terms |
| British | Nursery → Year 13 | GCSE 9–1 | 3 terms |
| American | Pre-K → Grade 12 | A–F / GPA | 2 semesters |
| IB | Configurable | 1–7 | 2 semesters |

---

## Brand Colors

| Color | Hex | Usage |
|---|---|---|
| Indigo (Primary) | `#6366F1` | Buttons, active states, brand |
| Emerald (Accent) | `#10B981` | Success states, growth indicators |
| Slate (Neutral) | `#0F172A` | Primary text |

---

*EduNexus · Next.js 16 monorepo · Phase 2 (Super Admin Portal) Complete*
