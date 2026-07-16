# EduNexus — Agent Instructions

## Project Identity

**Product:** EduNexus — Multi-tenant K-12 School Management System
**Target Market:** Ghana & West Africa (configurable for British/American curricula)
**Status:** Next.js 16 + PostgreSQL (TypeScript). Supersedes the original React 19 + Supabase (JS) codebase — the rewrite is complete and the app now ships role-based portals (Phase 2 Super Admin Portal done, Phase 3a next).
**Roadmap:** `ROADMAP.md` (v2, restructured Jul 2026 — see "Roadmap Version History" below)
**Design Doc:** `docs/superpowers/specs/2026-07-08-edunexus-rewrite-design.md`

## Key Contacts

- **Product decisions:** See design doc above

---

## Roadmap Version History

- **v1 (role-based):** Original phase plan, organized purely by portal (Admin → Teacher → Student → Parent). Phases 1–2 were built against this version.
- **v2 (current):** Same role-based delivery cadence, but with three corrections identified during a roadmap review:
  1. **Admissions/enrollment was missing entirely** — you can't have students without an intake pipeline. Inserted as **Phase 3a**, before the original Phase 3.
  2. **Ghana compliance was missing entirely** — WAEC/BECE candidate exports, GES report formats, statutory SSNIT/PAYE filing exports. Added as **Phase 9**, and it's likely the strongest differentiator against generic school SaaS, so don't deprioritize it.
  3. **Platform operator (super_admin) work incorrectly stopped after Phase 2** in v1. In reality, every later phase adds something the operator needs to see, meter, or gate (new module to monitor, new payment flow to reconcile, new comms cost to cap). v2 tracks these explicitly in `ROADMAP.md §16` and tags them to the phase they attach to — **agents should pull the relevant §16 item into the current phase's task list, not defer it**.
- Communication (now Phase 7) was also moved earlier than Design Polish (now Phase 8), because Parent Portal (Phase 6) depends on announcements/notifications existing — building comms after Parent Portal in v1 left dead UI stubs.

**Always check `ROADMAP.md` for the current phase table before starting work — this file describes *how* to build, `ROADMAP.md` describes *what* and *in what order*.**

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
- Next.js proxy resolves tenant from subdomain → attaches `x-tenant-id` header
- ALL API routes read `school_id` from proxy-set header, NEVER from client body
- Drizzle query layer uses a helper that auto-injects `WHERE school_id = ?`
- Super admin routes bypass tenant scoping (separate route group)

### Entity Build Order (guidance, not a gate)
`ROADMAP.md §1` defines a dependency graph across 10 entity layers (Tenancy → Academic Structure → People/Admissions → Scheduling → Assessment → Finance → Communication → Portals → Extended Modules → Ghana Compliance → Hardening). Before implementing a new entity or feature:
1. Check `ROADMAP.md §1` for what it depends on.
2. Confirm the dependency is actually merged (check `docs/superpowers/plans/` and recent git log), not just planned in the roadmap.
3. If a dependency is missing, raise it rather than stubbing around it — stubs around a missing entity (e.g. a fee invoice screen with no `Enrollment` record to attach to) are exactly the kind of rework this ordering exists to avoid.

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
- Proxy (`proxy.ts`, Next.js 16's replacement for `middleware.ts`) validates: auth → role matches route → tenant matches domain
- API routes have a second layer of role validation via `requireRole()` guard
- Super admin write operations (school CRUD, user lifecycle) use elevated privilege
- `profiles.school_id` is nullable — super admins have no school association

### Future Auth Improvements (Phase 3+)
- Password reset flow (email-based)
- Email verification on registration
- Account lockout after N failed attempts
- Session management (view/revoke active sessions)
- Rate limiting on `/api/auth/*` endpoints
- 2FA for `admin` and `super_admin` roles (see `ROADMAP.md §10.2`)
- Consider SMS OTP (via Africa's Talking) for parent/student accounts — more natural for Ghana's mobile-first market than OAuth

### URL Structure
- `console.edunexus.com` — Super admin portal + login
- `{school-slug}.edunexus.com` — Per-school portal
- Custom domain support — done in Phase 2 (billing schema has `domain`/`customDomain` on `schools`)

### Code Conventions
- TypeScript strict mode everywhere
- Use `cn()` from `@/lib/utils` for conditional class names
- All monetary values stored as `numeric` in GHS
- All dates stored as ISO 8601 UTC, displayed in `en-GH` locale
- Delete actions must always show a confirmation dialog
- Empty states: icon + heading + description + CTA
- Loading states: skeleton loaders, never full-page spinners

---

## Build Phases (Role-Based, v2)

| Phase | Description | Primary Role | Status |
|---|---|---|---|
| **1 — Foundation** | Next.js scaffold, Drizzle schema, proxy, Auth.js, Docker, CI | super_admin (platform) | ✅ Complete |
| **2 — Super Admin Portal** | School CRUD, user lifecycle, billing schema, payment infra, email service, audit logs, shadcn/ui | super_admin | ✅ Complete |
| **3a — Admissions & Enrollment** | Applicant intake, admissions review, Student/Guardian conversion, bulk import, transfer/withdrawal | admin | 🟡 [3a.1.1] done — [3a.1.2] next |
| **3 — Admin Portal** | Academic structure, Students, Staff, Classes, Subjects, Timetable, Fee setup, Payroll, Reports | admin | ⬜ Pending |
| **4 — Teacher Portal** | Attendance, Assessments, Grades, Report Cards, Lesson Plans, behavior logging | teacher | ⬜ Pending |
| **5 — Student Portal** | View timetable, grades, report cards, attendance, fees | student | ⬜ Pending |
| **6 — Parent Portal** | Children overview, payments (Paystack/MoMo), payment history | parent | ⬜ Pending |
| **7 — Communication** | Notifications, announcements, messaging, SMS/Email — moved before Design System (v1 had it after, leaving Phase 6 with dead stubs) | all roles | ⬜ Pending |
| **8 — Design System** | Full design system, animations, responsive, a11y, all UI states | all roles | ⬜ Pending |
| **9 — Ghana Compliance** | GES reporting exports, WAEC/BECE candidate registration, SSNIT/PAYE statutory filing, report card format compliance | admin (platform-assisted) | ⬜ Pending |
| **10 — Production Hardening** | Sentry, rate limits + 2FA, backups, PWA/offline, performance, docs, load testing | super_admin (platform-wide) | ⬜ Pending |
| **11 — Extended Modules** | Library, Transport, Hostel/Boarding, Inventory, Behavior gamification, Wellness, Alumni, AI insights | admin (varies by module) | ⬜ Pending |

**Full breakdown of each phase into epics, issues, tasks, and acceptance criteria lives in `ROADMAP.md` — this table is a status summary only, do not duplicate detail here.**

### Platform Operator (super_admin) work does not stop at Phase 2

`ROADMAP.md §16` lists super_admin-only features that attach to *later* phases: cross-tenant dashboard and support impersonation (Phase 3), payment reconciliation and dunning automation (Phase 6), platform-wide announcements and comms cost monitoring (Phase 7), bulk compliance export (Phase 9), system health dashboard and data export/deletion tooling (Phase 10), module marketplace toggles (Phase 11). **When planning a phase, check §16 for the operator-facing item attached to it and schedule it in the same sprint** — these were the single biggest gap in v1 of the roadmap and should not silently drop again.

---

## Current Working Phase

**Phase 2 — Super Admin Portal** — ✅ Complete (24 issues #4–#27 closed)

**Phase 3a — Admissions & Enrollment** — ✅ Complete
- ~~[3a.1.1] Public application form~~ ✅ Complete (PR #115, merged to `preview` Jul 10)
- ~~[3a.1.2+3a.1.3] Admissions review queue & enhanced data collection~~ ✅ Complete (commit `e44f026`, Jul 15)
- ~~[3a.1.4] Status notifications, cooldown & anonymization~~ ✅ Complete (commit `e44f026`, Jul 15)
- ~~[3a.2.1] Accepted → Student conversion~~ ✅ Complete (PR #121, merged to `preview` Jul 15)
- ~~[3a.2.2] Direct student entry (manual form + CSV import)~~ ✅ Complete (10 commits on `51-3a2-2-direct-student-entry`, Jul 15)
- ([3a.2.3] Bulk import via CSV — covered by [3a.2.2] CSV import above)

**Phase 3 — Admin Portal** — ⬜ Next

Phase 1/2 prerequisites confirmed before Phase 3a work: `ROADMAP.md §1` Layer 1 (Academic Structure) exists in schema with seed data; Resend email service (Phase 2) reusable for applicant confirmations.

---

## Lesson Learned (Jul 2026)

Phase 2 was implemented in one large batch — this introduced several type errors, schema mismatches, and component library inconsistencies that had to be fixed post-hoc. **Future phases will be broken down into smaller, verifiable tasks**, each with its own typecheck + test gate before proceeding to the next.

### Small-Task Workflow (all phases going forward)

1. **Write the plan first** — `docs/superpowers/plans/` with task-level granularity, one entry per `ROADMAP.md` issue ID (e.g. `3a.1.1`, `3a.2.1`)
2. **One task at a time** — implement, typecheck, test, then move on
3. **Never batch-implement** across API + UI + schema in a single pass
4. **Use shadcn/ui Nova components only** — no custom wrappers; prefer `Controller` + Nova primitives over `FormField`/`FormItem` pattern
5. **Verify DB schema types** before writing routes (numeric → string, nullability, required fields)
6. **Commit after each working task**, not at phase end
7. **Check the issue's acceptance criteria in `ROADMAP.md` before marking a task done** — AC are written to be testable; if you can't demonstrate the Given/When/Then, the task isn't finished
8. **Always pass `items` prop on `<Select>` when options have UUID values** — the `items` array of `{ value, label }` tells `<SelectValue>` to display the human-readable label instead of the raw UUID. Without it, the trigger shows the value (e.g. a UUID) on selection. This has been a recurring bug; both the application form and accept dialog were fixed for this.

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

Redis/MinIO are optional — only needed for BullMQ queues & file uploads (Phase 3a+, e.g. applicant document upload).
When you need them later, install Redis via WSL (`sudo apt install redis`) or use a free Redis Cloud tier.

If using Docker in WSL (not Docker Desktop):
```bash
# Install docker.io inside WSL2, set DOCKER_HOST
sudo apt install docker.io
# Then docker-compose up works without Docker Desktop overhead
```

`docker compose up` as a fully working dev environment is still a Phase 1 exit criterion that hasn't been closed out — see `ROADMAP.md §11 [10.8]`. Don't assume it works; verify before relying on it in CI or onboarding docs.

---

## SQL Conventions

- All tables have `id uuid primary key default gen_random_uuid()`
- All tenant-scoped tables have `school_id uuid references schools(id) not null`
- All tables have `created_at timestamptz default now()`
- Composite indexes on `(school_id, ...)` for all query patterns
- Soft delete via `deleted_at timestamptz` on major tables
- Audit logging on all write operations — every insert/update/delete on a tenant-scoped table must have a corresponding `audit_logs` row with `userId` and `schoolId` populated (this was a post-hoc fix in Phase 2; don't reintroduce the gap in new tables)

---

## Ghana-Specific Non-Negotiables

- Ghana Academic Calendar (3 terms) is default; GES term-date presets should be selectable when creating an academic year (`ROADMAP.md §10 [9.5]`)
- Ghana Basic Grading (Grade 1-6) with defined assessment weighting
- SSNIT: Employee 5.5%, Employer 13%
- PAYE: Ghana tax bands with annual calculation
- Mobile Money: MTN, Vodafone, AirtelTigo with auto-network detection
- Currency: GHS — store as `GHS` in receipts/printed output, not the `₵` glyph (thermal printer codepage issue, fixed in POS work — apply the same rule here defensively)
- Locale: en-GH
- WAEC/BECE candidate registration export format and GES statutory reporting are tracked in `ROADMAP.md §10` (Phase 9) — treat these as product requirements, not optional polish

---

## Testing

- Unit: Vitest (utilities, calculations)
- Integration: Vitest + Supertest (API routes)
- Component: Vitest + Testing Library (UI components)
- E2E: Playwright (critical user journeys)
- Tenant isolation: Dedicated test suite verifying cross-tenant data isolation
- New for Phase 3a+: idempotency tests for any operation that can be retried or double-submitted (applicant→student conversion, bulk CSV import, payment webhooks) — see `ROADMAP.md` acceptance criteria for `[3a.2.1]`, `[3a.2.2]`, `[6.3]`

---

## Handoff Notes

When starting a new session working on EduNexus:
1. Read `AGENTS.md` (this file) for project context and conventions
2. Read `ROADMAP.md` for the phase map, entity dependency graph (§1), role coverage matrix (§1a), and platform-operator backlog (§16)
3. Check which phase is current (see "Current Working Phase" above, and confirm against `docs/superpowers/plans/`)
4. Review the most recent git log for context on what was last worked on
5. Read relevant files in the phase you're implementing before writing code
6. Read `docs/superpowers/plans/` for the current phase's task-level plan and acceptance criteria
7. Cross-check `ROADMAP.md §16` for any platform-operator item attached to the current phase — pull it into the same plan rather than deferring it