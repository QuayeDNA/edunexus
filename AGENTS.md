# EduNexus — Agent Instructions

**Product:** Multi-tenant K-12 School Management System  
**Target:** Ghana & West Africa (British/American curricula configurable)  
**Stack:** Next.js 16 + Drizzle ORM + PostgreSQL 17 + TypeScript strict  
**Monorepo:** Turborepo (pnpm workspaces)

---

## Quick Status

| Area                                        | Status                              |
| ------------------------------------------- | ----------------------------------- |
| Phase 1–2 (Foundation + Super Admin Portal) | ✅ Complete                         |
| Phase 3a (Admissions & Enrollment)          | ✅ Complete                         |
| Phase 3 (Admin Portal)                      | ⏳ Refactor sprint first            |
| Current branch                              | `epic-refactor-sprint-1`            |
| Next issue                                  | [3.1.1] Academic Years & Terms CRUD |

---

## Tech Stack

Next.js 16 App Router | Drizzle ORM | PostgreSQL 17 | Auth.js v5  
shadcn/ui v4 Nova | TanStack Table v8 | react-hook-form + zod  
TanStack Query | Paystack API | Resend API | Africa's Talking  
jsPDF | Vitest | Playwright | Turborepo | S3-compatible storage

---

## Repository Structure

| Path                | Responsibility                                                            |
| ------------------- | ------------------------------------------------------------------------- |
| `apps/web`          | Next.js app — pages, API routes, components, hooks, services, lib         |
| `packages/database` | Drizzle schema, client, migrations, seed — import as `@edunexus/database` |
| `packages/shared`   | Shared types, constants, utilities — import as `@edunexus/shared`         |

## Import Rules (MANDATORY)

- **Within `apps/web`:** Use `@/` alias — `@/components/ui`, `@/lib/api`, etc.
- **Cross-package:** `@edunexus/database` and `@edunexus/shared` only — **never** reach into `src/` directly (e.g. `@edunexus/database/src/schema` is forbidden).
- **DB access:** API route handlers, Server Components, and server scripts only — never client components.

---

## Architecture Must-Follows

### Multi-Tenancy

- Shared DB with `school_id` on every tenant-scoped table.
- Proxy resolves subdomain → `x-tenant-id` header.
- **All API routes read `school_id` from proxy header, never from client body.**
- Super admin routes bypass tenant scoping (separate route group).

### Entity Build Order

Follow `ROADMAP.md §1` dependency graph. Before building a new entity:

1. Check what it depends on.
2. Confirm dependencies are actually merged (check `docs/superpowers/plans/` and git log).
3. Raise missing dependencies rather than stubbing around them.

### Data Layer

- Never call DB inside React components. Use Drizzle in API routes or Server Components.
- Wrap all server state in **TanStack Query** hooks on the client (admin + super-admin).
- Cache critical data in Dexie with `syncStatus: 'pending' | 'synced' | 'error'`.

### Auth

- Auth.js v5 (Credentials provider: email/password).
- Passwords: `scrypt:{64-byte-salt}:{hash}`.
- Session: `user.id`, `user.role`, `user.schoolId` (null for super_admin).
- Server Components use `requireRole()` from `@/lib/auth/auth.guard` (redirects).
- API routes use `requireRole()` from `@/lib/api/require-role` (returns error).  
  ⚠️ These are different functions with the same name — use the correct import for your context.

### Component Conventions

- **Nova components only** — no custom wrappers. Prefer `Controller` + Nova primitives over `FormField`/`FormItem`.
- **Select requires `items` prop on every usage** — Base UI's `<SelectValue>` renders raw values unless `items` (or `getLabel`) is provided. Always pass `items={list.map(i => ({ value: i.id, label: i.name }))}` or an inline array of `{ value, label }` objects. Requires BOTH `<SelectItem>` children (for the popup) AND the `items` prop (for the trigger label).
- **Select with react-hook-form** — use `value={field.value}` not `defaultValue={field.value}`. The latter triggers controlled/uncontrolled warnings when `field.value` initialises asynchronously.
- **Buttons as links** — use `buttonVariants()` + `<Link>`, never `<Button asChild>`.
- **Modals** — use Nova `Dialog` component, never custom `fixed inset-0` markup.
- Delete actions must show confirmation dialog.
- Empty states: icon + heading + description + CTA.
- Loading states: skeleton loaders, never full-page spinners.

---

## Current Phase

**Refactor Sprint** — `epic-refactor-sprint-1`

✅ All planned tasks complete. Ready for [3.1.1] Academic Years & Terms CRUD.

---

## Conventions

### Code

- TypeScript strict mode. No `any` unless unavoidable.
- `cn()` from `@/lib/utils` for conditional classes.
- Monetary values: `numeric` in GHS. Store as "GHS" in output, not `₵` (thermal printer issue).
- Dates: ISO 8601 UTC, display in `en-GH` locale.

### Clean Code

**Types & Interfaces**

- Extract all interfaces and types to dedicated `types/*.ts` files — never define inline interface types inside components or route handlers.
- Use `import type { ... }` for type-only imports (compiler hint, also documents intent).
- Prefer `interface` over `type` for object shapes; use `type` for unions, intersections, and utility types.

**API Routes**

- Wrap every route handler with `routeHandler()` from `@/lib/api/handler` — this centralises error handling via `handleApiError()`.
- Throw typed errors (`NotFoundError`, `ValidationError`, `ConflictError`, `ForbiddenError`, or `AppError`) instead of `return apiError(...)`. `routeHandler` catches and serialises them.
- Auth guard early-return (`if (error) return error`) is the one exception — `requireRole` returns `{ error, user }`, do NOT throw for auth failures.
- Validation: `throw parsed.error` (ZodError) in routeHandler-wrapped handlers — ZodError is handled by `handleApiError`.
- Services: throw typed `AppError` subclasses so handlers don't need try/catch logic. The `routeHandler` wrapper catches everything.
- Remove dead imports when refactoring error handling (e.g., remove `apiError` and `handleApiError` imports after wrapping with `routeHandler`).

**Components**

- No inline interface types — import from `@/types/{entity}` instead.
- One clear responsibility per component file. If a file exceeds ~250 lines or has multiple unrelated responsibilities, split it.
- Use `useQuery` / `useMutation` from TanStack Query for all server state — never raw `fetch()` + `useState`/`useEffect`.

**TypeScript Quality**

- Never use `as any` in production code. If a type is genuinely unavoidable, document why in a comment.
- Type Drizzle condition arrays as `(SQL | undefined)[]`, never `any[]`.
- Replace `catch (err: any)` with `catch (error)` and use `instanceof` checks or `handleApiError()`.
- Avoid `as Record<string, unknown>` for spread objects — prefer explicit interfaces or `satisfies`.

### SQL

- `id uuid primary key default gen_random_uuid()`
- Tenant tables: `school_id uuid references schools(id) not null`
- `created_at timestamptz default now()`
- Composite indexes on `(school_id, ...)`.
- Soft delete via `deleted_at timestamptz` on major tables.
- **Audit logging** on every write (insert/update/delete) — `audit_logs` row with `userId` and `schoolId`.

### Ghana

- 3-term academic year default (GES presets).
- SSNIT: 5.5% employee / 13% employer.
- PAYE: Ghana tax bands.
- Mobile Money: MTN, Vodafone, AirtelTigo.
- WAEC/BECE/GES compliance = product requirement, not polish (Phase 9).

---

## Workflow

1. **Write the plan first** — `docs/superpowers/plans/` with task-level granularity.
2. **One task at a time** — implement, typecheck, test, then move on.
3. **Never batch-implement** across API + UI + schema in a single pass.
4. **Verify DB schema types** before writing routes (numeric→string, nullability).
5. **Commit after each working task**, not at phase end.
6. **Check acceptance criteria** in ROADMAP.md before marking done.
7. **Typecheck + test pass** before every commit.

---

## Dev Setup

```bash
pnpm install
pnpm db:migrate    # drizzle-kit push
pnpm db:seed       # demo school + superadmin
pnpm dev           # http://localhost:3000
# Login: admin@edunexus.com / Admin@123
```

Redis/MinIO optional (BullMQ, file uploads). Docker not required for dev.

---

## Testing

| Type             | Tool                     | What                                                     |
| ---------------- | ------------------------ | -------------------------------------------------------- |
| Unit             | Vitest                   | Utilities, calculations                                  |
| Integration      | Vitest + mock DB         | API route handlers                                       |
| Component        | Vitest + Testing Library | UI components                                            |
| E2E              | Playwright               | Critical user journeys                                   |
| Tenant isolation | Dedicated suite          | Cross-tenant data isolation                              |
| Idempotency      | Scoped tests             | Retry-safe operations (conversion, CSV import, payments) |

---

## Session Start

1. Read `AGENTS.md` (this file) for context + conventions.
2. Read `ROADMAP.md` for phase map + entity deps (§1) + platform-operator items (§16).
3. Check current branch and latest git log.
4. Read `docs/superpowers/plans/` for current task plan.
5. Cross-check `ROADMAP.md §16` for platform-operator items attached to the current phase.
