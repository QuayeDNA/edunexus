# Phase 2 — Super Admin Portal: Acceptance Criteria

> Source: `docs/superpowers/plans/2026-07-09-phase-2-super-admin-portal.md`
> Purpose: Manual verification checklist. Each task is verified end-to-end (UI → API → DB) before being marked complete.

## Task 1 — Install & Configure shadcn/ui
The super admin / platform should be able to:
- Run the app with shadcn/ui initialized (`components.json`, theme tokens in `tailwind.config.ts` + `globals.css`, `cn()` util present).
- Use the core installed components: button, card, dialog, form, input, select, table, badge, tabs, dropdown-menu, sheet, toast, skeleton, avatar, separator, command, popover, alert-dialog, textarea, switch.
- Confirm the project typechecks cleanly with no shadcn-related errors.

## Task 2 — Billing Schema Tables
The system should be able to:
- Create three new DB tables: `school_plans`, `school_subscriptions`, `invoices` (via `db:migrate`).
- Add `domain` and `custom_domain` columns to the `schools` table.
- Export the billing tables from the schema index and apply the correct indexes.
- Typecheck the `database` package cleanly after migration.

## Task 3 — Shared API Infrastructure
The API layer should be able to:
- Return the standard `{ success, data, error, errors, meta }` envelope from every route.
- Guard every route with `requireRole('super_admin')`, rejecting unauthenticated requests (401) and non-super-admin requests (403).
- Use the standard `AppError` hierarchy (NotFound / Unauthorized / Forbidden / Validation / Conflict).
- Provide a shared client (`useAuthenticatedFetch`, `QueryClient` defaults) for client pages.

## Task 4 — Shared UI Components
Any Phase 2+ page should be able to:
- Render a `DataTable` with sorting, pagination, and client-side search/filter.
- Render a `ConfirmDialog` (with destructive styling option).
- Render an `EmptyState` (icon + heading + description + CTA).
- Render a `PageHeader` (title + description + action slot).
- Render a `StatCard` (icon, value, optional trend).

## Task 5 — Shared Hooks
Client pages should be able to:
- Use `useDebounce` to debounce input values.
- Use `usePagination` (page / pageSize / total / totalPages / next / prev).
- Use `useFilters` (set filter, reset, active filter count).
- Use `usePayment` to initialize and verify payments via `/api/payments`.

## Task 6 — Email Service
The system should be able to:
- Send transactional email via `sendEmail({ to, subject, html })`.
- Log (not send) emails in dev mode and route through Resend in production.
- Render and reuse the `welcomeAdminEmail` template.

## Task 7 — Payment Infrastructure
The system should be able to:
- Initialize and verify payments through an abstract `IPaymentProvider` interface.
- Use the `PaystackProvider` implementation (GHS→pesewas conversion, verify, webhook event parsing).
- Render a reusable `PaymentButton` and `PaymentStatus` badge.
- Acknowledge Paystack webhooks at `/api/payments/webhook`.

## Task 8 — Super Admin Dashboard
The super admin should be able to:
- View a dashboard showing Total Schools, Active Schools (active/inactive split), Total Users, New Signups (last 30 days), Users-by-Role breakdown, and System Status.
- See stats pulled live from the DB (`/api/super-admin/dashboard/stats`), not hardcoded.
- Experience skeleton loading states while data loads (TanStack Query).

## Task 9 — School Management CRUD
The super admin should be able to:
- List schools (search by name, filter active/inactive, paginated).
- Create a school with validation (slug regex, unique slug check).
- Have school creation auto-seed a default academic year, 3 terms, and KG1–JHS3 grade levels, and write an audit log entry.
- View a school detail page (tabs: overview / users / subscriptions).
- Edit a school (including the active toggle).
- Soft-delete a school (sets `deleted_at` + `isActive = false`) with an audit log entry.
- Have all routes guarded by `requireRole('super_admin')`.

## Task 10 — User Management
The super admin should be able to:
- List users (search by email, filter by school / role / status, paginated).
- Create an admin user for a school with email-uniqueness enforced per school.
- Have the created user's password scrypt-hashed and a welcome email (with temp password) sent.
- Edit a user (name, active, role) and deactivate (soft-delete) a user.
- NOT modify or delete `super_admin` users (returns 403).

## Task 11 — Audit Log Viewer
The super admin should be able to:
- View audit logs (action, table, record, timestamp).
- Filter logs by date range and paginate results.
- Confirm that creating / editing / deleting schools and users produces visible audit entries.

## Task 12 — Billing Management (Plans + Subscriptions)
The super admin should be able to:
- List, create, and edit plans (name, code, price GHS, billing cycle, max students/staff, features, active flag) with validation.
- List subscriptions (school, plan, price, status badge, started / next-billing dates).
- Update a subscription (change plan, set status: active / past_due / cancelled / expired).
- Confirm monetary values are stored as `numeric` and all routes are super-admin guarded.

## Task 13 — Update ROADMAP.md / AGENTS.md
- `ROADMAP.md` and `AGENTS.md` reflect the new role-based phase structure.
- Final `pnpm typecheck` (web + database) and `pnpm test` pass.

---

## Cross-Cutting Criteria (apply to every task)
- All API routes return the standard envelope and are `requireRole('super_admin')`-guarded.
- All CUD operations write to `audit_logs`.
- TypeScript strict mode, no `any` in production code.
- No hardcoded secrets; all env via `process.env`.
- Monetary values use `numeric(12,2)` in GHS; dates stored ISO 8601 UTC.
- Pagination is consistent (`page` / `pageSize` / `total` / `totalPages` meta).
