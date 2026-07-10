# EduNexus — Phase 1 & 2 Closeout Audit + Phase 3a–5 Grounded Plans

> Based on a direct read of `github.com/QuayeDNA/edunexus` (main branch, pulled via GitHub API — see Method Note). This is not a re-statement of `AGENTS.md`/`ROADMAP.md` claims; it's what's actually in the repo, checked file by file, with the gaps that changes.

---

## 0. Method Note

Checked: full repo tree (166 files), `packages/database/src/schema/*` (all 16 schema files + index), `apps/web/app/(super-admin)/dashboard/page.tsx`, `auth.guard.ts`, `seed.ts`, `docker-compose.yml`, `.github/workflows/ci.yml`, `apps/web/package.json` dependencies, and GitHub Actions run history (zero runs exist — the CI workflow has never executed). No app database was queried; conclusions come from source code, not runtime behavior.

---

## 1. Headline Finding — the roadmap didn't drift, it inverted

This is the single most important thing to fix before touching Phase 3, and it's the root cause of the doc/code sync problem you're trying to solve:

**`packages/database/src/schema/index.ts` already exports tables for every phase through Phase 11** — `books`/`bookLoans` (Library, Phase 11), `vehicles`/`routes`/`studentTransport` (Transport, Phase 11), `inventoryItems`/`inventoryTransactions` (Inventory, Phase 11), `announcements`/`messages`/`notifications` (Communication, Phase 7), `behaviorRecords`/`wellnessCheckins`/`parentEngagements`/`lessonPlans` (Behavior/Wellness, Phase 4 & 11), `payrollRuns`/`payslips` (Payroll, Phase 3) — all scaffolded during what was scoped as "Phase 1 — Foundation."

Meanwhile, **Phase 2's actual claimed deliverables mostly don't exist in code**: the super admin dashboard (`apps/web/app/(super-admin)/dashboard/page.tsx`) renders hardcoded `0`, `0`, `"Healthy"` — not a single DB query. There are no school CRUD pages, no user CRUD pages, no audit log viewer, no billing pages, no API routes beyond auth and tenant resolution. `apps/web/package.json` has no `react-hook-form`, no `@tanstack/react-table`, no Resend SDK, no Paystack SDK, no BullMQ/ioredis, no `ws` — every dependency the design doc names for Phase 2's payment/email/table infrastructure is simply not installed.

**In plain terms: the project went wide on schema (all 10 future phases) instead of deep on Phase 2 (the phase actually in progress).** This is exactly the "scope creep" you're worried about — it already happened, just in the data layer instead of the feature layer, which is why it wasn't obvious from using the app. It also explains the gap between what `AGENTS.md`/`ROADMAP.md` marked "✅ Complete" and what's actually running.

This changes how Phases 1–2 need to be closed and how 3a–5 need to be planned:
- **Don't schedule new schema work for Phases 3–5 without auditing what's already there first** — you likely already have most of the tables you need, but they were designed speculatively, before the actual admissions/attendance/grading business logic was worked out, so field-level correctness isn't guaranteed.
- **Phase 2 needs to be reopened, not "refactored"** — there's no existing implementation to restructure, there's a shell to build out.
- **Going forward, schema and features need to move in lockstep, gated by the same phase.**

---

## 2. Phase 1 — Foundation: Actual State vs Claimed

| Claimed (AGENTS.md/ROADMAP.md) | Actual state found in repo |
|---|---|
| Turborepo + pnpm workspaces (4 packages) | ✅ Confirmed — `turbo.json`, `pnpm-workspace.yaml`, `apps/web` + `packages/database` + `packages/shared` present |
| Next.js 16 App Router, Turbopack, TS strict, Tailwind v4 | ✅ Confirmed — `next.config.ts`, `postcss.config.mjs`, `tsconfig.json` present |
| Drizzle ORM schema (43 tables) | ✅ Confirmed, but see §1 — table count matches, scope does not (Phase 3–11 tables mixed in) |
| Auth.js v5, JWT sessions, scrypt hashing | ✅ Confirmed — `lib/auth/auth.config.ts`, `auth.guard.ts`, `auth.utils.ts`, scrypt logic visible in `seed.ts` |
| Multi-tenant proxy (subdomain → school_id) | ✅ Confirmed — `proxy.ts`, `lib/tenant/{cache,host,resolve}.ts` present |
| Role-based route protection, 5 role layouts | 🟡 Partial — route groups and `layout.tsx` exist per role, but `requireRole()` in `auth.guard.ts` is a **page-level redirect guard only**; there is no equivalent API-route guard that returns a structured JSON error (needed for Phase 3+ API routes) |
| Dexie offline schema + sync service | ✅ Confirmed — `dexie/schema.ts`, `dexie/sync-service.ts` present (not verified against real writes — no UI calls it yet) |
| GitHub Actions CI + Vercel deploy workflow | 🟡 Workflow files exist and look correct, **but have never run** — zero recorded runs on the repo. "CI passes on every PR" is unverified, not proven |
| Seed script (demo school + superadmin) | 🟡 Partial — creates 1 school, 1 academic year, 3 terms, 11 grade levels, 1 superadmin. **Does not seed a demo admin/teacher/student/parent account**, despite 5 role layouts existing to demo |
| `profiles.school_id` nullable | ✅ Confirmed in `seed.ts` (`schoolId: null` for super_admin) |
| `docker compose up` full dev environment | ❌ Not what's built — `docker-compose.yml` only runs **infra** (postgres, redis, minio, mailpit). The Next.js app itself is not containerized; you still run `pnpm dev` locally. This matches the roadmap's own "pending" flag — it's honestly labeled already, just worth confirming the fix scope (containerize infra-only vs. full app) before "closing" it |
| Two subdomains resolve to separate tenant data | ⬜ Genuinely untestable without DNS/local host entries — no evidence either way, correctly flagged pending |

### Phase 1 Closeout Plan

**[1-CLOSE.1] ✅ Add an API-route auth guard, distinct from the page guard**
- Depends on: none — Roles: all
- Task: create `lib/auth/require-role.api.ts` (or similar) that returns `NextResponse.json({error}, {status: 401|403})` instead of `redirect()`, for use inside `app/api/**/route.ts` handlers. `auth.guard.ts`'s `requireRole()` stays as-is for Server Components/layouts.
- **✅ Done (verified 2026-07-10):** Implemented as `apps/web/lib/api/require-role.ts` (returns `apiError(401)`/`apiError(403)` — JSON, never a redirect), distinct from the page guard `apps/web/lib/auth/auth.guard.ts` (uses `redirect()`). Wired into all 10 super-admin API routes. This predates this audit doc — the doc's "missing" finding was against the remote `main` (10 commits behind the local branch where Task 3 added it). No new code required.
- AC: Given an unauthenticated request to any `/api/*` route requiring a role, when the guard runs, then it returns a JSON 401/403 response, never a redirect (redirects break API clients and TanStack Query error handling).

**[1-CLOSE.2] Seed a full demo account set, one per role**
- Task: extend `seed.ts` to create one `admin`, `teacher`, `student`, `parent` profile scoped to the demo school, plus a minimal `student_guardians` link, so all 5 role dashboards are demoable, not just super_admin.
- AC: Given `pnpm db:seed` runs, then logging in as each of the 5 seeded accounts reaches that role's dashboard without error.

**[1-CLOSE.3] Verify CI actually runs and passes**
- Task: open a real PR against `main` (even a trivial one) and confirm the `ci.yml` workflow triggers, and `lint`/`typecheck`/`test`/`build` all pass against the current codebase — don't assume the workflow file being correct means it's been exercised.
- AC: A GitHub Actions run for the PR exists in `Actions` tab with a `success` conclusion for all four steps.

**[1-CLOSE.4] Decide and document `docker-compose.yml` scope**
- Task: either (a) explicitly re-label the Phase 1 exit criterion as "infra services containerized; app runs via `pnpm dev`" and close it as met, or (b) add an `app` service to `docker-compose.yml` if a fully containerized dev loop is actually required. Don't leave it ambiguous — pick one and update `ROADMAP.md`'s exit criteria wording to match reality.
- AC: `ROADMAP.md` Phase 1 exit criteria table has no item worded in a way that doesn't match what `docker-compose.yml` actually does.

**[1-CLOSE.5] Confirm subdomain tenant isolation with a real test**
- Task: add a Playwright or integration test that hits two different subdomains against the local dev server (via `Host` header override, doesn't require real DNS) and asserts each resolves a different `school_id` via `/api/internal/resolve-tenant`.
- AC: Test passes in CI, closing the "two subdomains resolve to separate tenant data" exit criterion with actual evidence instead of a DNS-dependent manual check.

**Once 1-CLOSE.1–5 are done, Phase 1 can be marked ✅ Complete with confidence — not before.**

---

## 3. Phase 2 — Super Admin Portal: Actual State vs Claimed

| Claimed | Actual state found in repo |
|---|---|
| shadcn/ui v4 Nova, 14+ core components | ❌ Only 7 basic components exist: `avatar`, `badge`, `button`, `card`, `input`, `label`, `skeleton`. No `dialog`, `table`, `select`, `tabs`, `dropdown-menu`, `sonner`/toast, `form` |
| Billing schema: school_plans, subscriptions, invoices | ❌ Not found anywhere in `packages/database/src/schema/` — no `billing.ts` file, no such exports in `schema/index.ts` |
| Shared API infra: response helpers, error classes, require-role guard, TanStack Query client | 🟡 `@tanstack/react-query` is installed and `providers.tsx` exists (likely wraps `QueryClientProvider`), but no `lib/api/response.ts`-style helpers or error classes found; no API-layer role guard (see 1-CLOSE.1) |
| Shared UI: data-table, confirm-dialog, empty-state, page-header, stat-card | ❌ None of these exist as components. The dashboard's "stat cards" are hand-built inline JSX in the page file, not a reusable component |
| Shared hooks: use-pagination, use-filters, use-debounce, use-payment | ❌ Only `use-session.ts` exists |
| Email service: Resend wrapper + template | ❌ No Resend dependency installed, no `lib/email` or `services/email` directory |
| Payment infra: IPaymentProvider, Paystack provider, webhook | ❌ No Paystack dependency installed, no payment-related files found |
| Super admin dashboard: real stats from DB | ❌ Hardcoded `0`, `0`, `"Healthy"` — confirmed by direct read of the page source |
| School management CRUD | ❌ No pages beyond `dashboard/page.tsx` and `layout.tsx` under `app/(super-admin)/` |
| User management CRUD | ❌ Not found |
| Audit log viewer | ❌ Not found — the `audit_logs` table schema exists and is well-formed (school/user/action/table/old-new-data/IP/user-agent), but nothing reads or writes to it yet |
| Billing management (plans/subscriptions) | ❌ Not found, consistent with missing billing schema |

**Bottom line: Phase 2 is a route-group shell with a static dashboard. Essentially none of its described feature work exists.** This isn't a criticism of effort — schema-first is a legitimate way to work — but the status label needs to change from ✅ to 🟡/⬜ immediately so Phase 3 doesn't get built on an assumption of infrastructure (shared UI kit, API helpers, email/payment services) that isn't there.

### Phase 2 Reopened Plan

Using the Small-Task Workflow already defined in `AGENTS.md` — one task, one typecheck/test gate, commit, move on. Ordered so each task's dependency actually exists before it starts.

**Epic 2.1 — Shared UI kit (blocks everything else)**
- [2.1.1] Install and configure `@tanstack/react-table`; build `data-table.tsx` (sortable, paginated, generic over row type)
  - AC: A story/demo page renders a table of ≥20 mock rows with working sort and page-size controls.
- [2.1.2] Add Radix `dialog` primitive; build `confirm-dialog.tsx` (title, description, confirm/cancel, danger variant)
  - AC: Triggering delete on any list shows the dialog; cancel closes without side effects; confirm fires the passed callback exactly once.
- [2.1.3] Build `empty-state.tsx` (icon + heading + description + CTA slot, per existing convention in `AGENTS.md`)
- [2.1.4] Build `page-header.tsx` (title, description, action-button slot)
- [2.1.5] Extract `stat-card.tsx` from the existing dashboard inline JSX, parameterized by icon/label/value/hint
  - AC: Dashboard page is refactored to use `<StatCard>` three times with identical visual output to today.

**Epic 2.2 — API layer infrastructure**
- [2.2.1] `lib/api/response.ts` — `ok()`/`fail()` JSON response helpers, consistent shape `{data}`/`{error, code}`
- [2.2.2] `lib/api/errors.ts` — `ApiError` class hierarchy (`NotFoundError`, `ForbiddenError`, `ValidationError`)
- [2.2.3] API-route `requireRole` guard — see [1-CLOSE.1], do this here if not already done
- [2.2.4] TanStack Query setup audit — confirm `providers.tsx` wraps a real `QueryClient` with sane defaults (staleTime, retry); add a `lib/query/keys.ts` convention file for query key factories before any hooks get written

**Epic 2.3 — Billing schema (net-new)**
- [2.3.1] `packages/database/src/schema/billing.ts` — `schoolPlans`, `schoolSubscriptions`, `invoices`, plus `domain`/`customDomain` columns added to `schools` (check current `schools.ts` first — **not present today**, contradicting the original Phase 2 notes)
  - AC: Migration applies cleanly against a fresh DB; `schema/index.ts` exports the three new tables.

**Epic 2.4 — Email service**
- [2.4.1] Install `resend`; `lib/email/client.ts` wrapper + `lib/email/templates/welcome-admin.tsx`
  - AC: A test script sends a real email via a Resend test/sandbox key and logs a message ID.

**Epic 2.5 — Payment infrastructure**
- [2.5.1] `lib/payments/provider.interface.ts` — `IPaymentProvider` (initialize, verify, webhook-handle)
- [2.5.2] `lib/payments/paystack.provider.ts` — implements the interface against Paystack's API
- [2.5.3] `app/api/webhooks/paystack/route.ts` — signature verification + idempotent transaction recording (tie to `ROADMAP.md [6.3]` AC on idempotency, even though payments UI is Phase 6 — the webhook plumbing belongs here since it's shared infra)

**Epic 2.6 — School management CRUD**
- [2.6.1] List page — `data-table` over `schools`, search/filter by `isActive`/`region`
- [2.6.2] Create — form (needs `react-hook-form`, not yet installed — add it) + seed logic (create year/terms/grade-levels on school creation, reusing `seed.ts`'s pattern rather than duplicating it — extract a shared `createSchoolDefaults()` helper both seed script and this route can call)
- [2.6.3] Detail page with tabs (overview, users, billing)
- [2.6.4] Edit

**Epic 2.7 — User management CRUD**
- [2.7.1] Create admin per school, auto-generate password, send welcome email (Epic 2.4 dependency)
- [2.7.2] List/edit/deactivate

**Epic 2.8 — Audit log viewer**
- [2.8.1] List page reading `auditLogs`, filterable by action/date/school — schema is ready, this is pure read-side UI work
- [2.8.2] Wire write-side: every mutation added in 2.6/2.7 must insert an `auditLogs` row (userId + schoolId populated, per the existing SQL convention in `AGENTS.md`)

**Epic 2.9 — Billing management UI**
- [2.9.1] Plans CRUD (depends on 2.3.1)
- [2.9.2] Subscriptions list, joined to schools/plans

**Definition of Done for Phase 2 (do not mark ✅ again without this):**
- Every epic above merged with passing tests
- Super admin dashboard renders real counts from the DB, not hardcoded values
- A fresh clone + `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev` lets someone create a school, create its admin, view the audit trail of both actions, and see a real (even if test-mode) Paystack charge succeed

---

## 4. Schema Governance Policy — preventing the inversion from recurring

This is the direct fix for "avoiding scope creep issues" going forward:

1. **No new table without a corresponding phase issue.** Before adding a schema file, name the `ROADMAP.md` issue ID it belongs to in the migration's commit message or PR description. If you can't name one, don't add it yet — write it into the roadmap first (even as a one-line placeholder in the right phase), then build it.
2. **Audit before reuse, every time.** Because so much schema already exists ahead of schedule (§1), every phase plan below starts with an audit step: open the existing schema file, check its fields against that phase's actual acceptance criteria, and file a migration to fix gaps — rather than assuming "the table exists" means "the table is right."
3. **`schema/index.ts` exports should roughly track `ROADMAP.md`'s phase table.** If `schema/index.ts` has exports for a Phase 8+ concept while Phase 3 is still open, that's a visible signal (in a `git diff` or code review) that something is out of sequence — worth a comment in the PR explaining why, or worth pulling the export out until its phase starts.

---

## 5. Phase 3a — Admissions & Enrollment (grounded plan)

**Audit first:** `students`, `guardians`, `studentGuardians` already exist and look solid (M:N guardian linking, `isPrimary`/`isEmergency` flags, proper indexes). **What's genuinely missing:** an `Applicant`/admissions-decision entity, and — this is the important one — **there is no `enrollments` table linking a student to a `class` for a given `academicYear`.** `classes` and `students` both reference `schoolId` independently with no join table between them. This was flagged as a risk in the original roadmap review and is now confirmed as a real gap, not a hypothetical one.

- **[3a.1] `applicants` schema** — new table: name/DOB/guardian-contact fields, `gradeLevelId` applied for, `status` enum (`submitted`/`under_review`/`accepted`/`rejected`/`waitlisted`), document URLs (S3/MinIO keys — MinIO is already in `docker-compose.yml`, just needs a client wired up, see Epic 2.1-adjacent work).
- **[3a.2] `enrollments` schema** — new table: `studentId`, `classId`, `academicYearId`, `status` (`active`/`transferred_out`/`withdrawn`/`graduated`), unique index on `(studentId, academicYearId)`. This is the single most load-bearing missing piece — attendance, grades, fees, and timetables in Phase 3/4 all logically hang off "which class is this student in this year," and there's currently no table that answers that.
- **[3a.3] Public application form** — per subdomain, writes to `applicants`; reuses Epic 2.4 email service for confirmation.
- **[3a.4] Admissions review queue** — admin-facing, list/filter/accept/reject/waitlist; capacity check reads `classes.capacity` against a `count(enrollments)` for that class+year.
- **[3a.5] Accepted → Student conversion** — transactional: create `students` + `enrollments` + `studentGuardians` rows together (or link existing `guardians` row if phone/email matches — decide and document the matching rule, don't leave it implicit).
- **[3a.6] Bulk CSV import** — same conversion logic as 3a.5, batched, with a row-level error report.
- **[3a.7] Transfer/withdrawal/re-admission** — status transitions on `enrollments`, not on `students` (keeps historical `Student` identity stable across years, which the original design doc correctly wanted).

---

## 6. Phase 3 — Admin Portal (grounded plan)

**Audit first — this is mostly true already:** `classes`, `subjects`, `classSubjects`, `gradeLevels`, `staff`, `timetableSlots`, `feeCategories`/`feeSchedules`/`studentFees`/`payments`/`expenses`, `payrollRuns`/`payslips`, `assessmentTypes`/`assessments`/`assessmentScores`/`reportCards` all already exist. **This phase is overwhelmingly an API + UI phase, not a schema phase** — resist the urge to "improve" the schema wholesale; fix specific fields only where a real acceptance criterion demands it.

- **[3.0] Schema audit pass (do this before any UI work):** for each of the tables above, check field-by-field against the AC in this section and file targeted migrations for genuine gaps only (e.g., confirm `payrollRuns` has a `status` enum for the draft→approve→process AC in the original roadmap — verify, don't assume).
- **[3.1] Academic structure CRUD** — `academicYears`/`terms` already exist (seeded); build UI on top, add the "locked term" behavior (`terms` needs a `locked: boolean` column — likely genuinely missing, confirm during 3.0).
- **[3.2] Classes & Subjects CRUD**, **class-subject-teacher assignment matrix** — schema ready, build UI + conflict-detection query (a teacher already assigned to a class-subject-timeslot).
- **[3.3] Students module** — list/detail/edit on top of `students` + `enrollments` (from Phase 3a); promotion/graduation workflow reads `assessmentScores`/`attendance` against configurable thresholds — this logic doesn't exist yet anywhere, it's genuinely new.
- **[3.4] Staff module** — CRUD on `staff` (exists); leave management needs a new `staffLeaveRequests` table — not found in current schema, confirm during 3.0 and add if missing.
- **[3.5] Timetable builder** — `timetableSlots` exists; conflict detection is new application logic, not a schema gap.
- **[3.6] Fees & Payroll** — schema is the most complete part of this phase already; this is close to pure UI + business-logic (SSNIT/PAYE calc — check `packages/shared/src/utils/ghana-payroll.ts`, which already exists and has a test file, so this may be further along than the rest of Phase 3).
- **[3.7] Reports hub** — read-only aggregation queries across the above; no new schema expected.

---

## 7. Phase 4 — Teacher Portal (grounded plan)

**Audit first:** `attendance`/`staffAttendance` and `assessmentTypes`/`assessments`/`assessmentScores`/`reportCards` already exist. Interestingly, `lessonPlans` and `behaviorRecords` are **already scaffolded too, inside `schema/behavior.ts`** — filed there ahead of need. Worth a small organizational cleanup: `lessonPlans` living in a file called `behavior.ts` is a naming mismatch worth fixing (`schema/lesson-plans.ts` or fold both into an `academics.ts` file) before it gets more entangled — cheap to fix now, awkward later.

- **[4.0] Schema audit + the `behavior.ts`/`lessonPlans` naming cleanup above.**
- **[4.1] Teacher dashboard** — reads `timetableSlots` (today's classes) + `assessments` (pending) — no new schema.
- **[4.2] Attendance marking** — `attendance` table exists; the ">48h edit requires reason" AC from `ROADMAP.md [4.2]` needs an `editReason`/`editedAt` column — confirm during audit.
- **[4.3] Assessment & grade entry** — schema exists; weighted-average calc is new application logic.
- **[4.4] Report cards** — `reportCards` table exists; "lock after finalization" needs a `status`/`lockedAt` field — confirm during audit.
- **[4.5] Lesson plans** — `lessonPlans` schema exists (see 4.0); build CRUD + publish flow.
- **[4.6] Behavior/incident logging** — `behaviorRecords` schema exists; this was originally scoped as Phase 4 feeding Phase 11 gamification, and the schema being ready early is fine here — it's a case where speculative schema happens to align with near-term need. Still worth field-auditing.

---

## 8. Phase 5 — Student Portal (grounded plan)

**Audit first:** no new schema expected at all — this phase is a read-only consumer of Phases 3a/3/4's data (`enrollments`, `attendance`, `assessmentScores`, `reportCards`, `studentFees`). Lowest schema risk of any phase in this document.

- **[5.1] Student dashboard** — aggregate read across the above.
- **[5.2] Timetable view** — reads `timetableSlots` joined via `enrollments`.
- **[5.3] Grade history + report card PDF** — reads `reportCards`; PDF generation needs `jsPDF` installed (not currently in `apps/web/package.json` — add it here, it's the first phase that actually needs it).
- **[5.4] Attendance record view** — reads `attendance`.
- **[5.5] Fee statement view** — reads `studentFees`/`payments`.

**Risk to flag explicitly:** this phase is trivial to build but impossible to build correctly ahead of Phase 3a's `enrollments` table — don't let anyone start Phase 5 UI work "in parallel" before 3a merges, or it'll be built against a guessed data shape.

---

## 9. Definition of Done — apply to every phase from here on

The reason Phase 2 got marked ✅ prematurely is there was no falsifiable checklist gating that label. Use this for Phase 3a onward, and retroactively for Phase 1/2 above:

- [ ] Every schema change has a passing migration against a fresh database (not just a `.ts` file that compiles)
- [ ] Every API route has at least one integration test hitting it over HTTP (Supertest), not just a unit test of internal logic
- [ ] Every UI page renders real data from the database in dev, screenshot or short recording attached to the closing PR
- [ ] Every acceptance criterion written in `ROADMAP.md` for that phase's issues is checked off with a one-line note on how it was verified
- [ ] `AGENTS.md`'s "Current Working Phase" section is updated in the same PR that closes a phase — not after, and not before it's actually true

---

## 10. Immediate Next Actions (in order)

1. Update `ROADMAP.md`/`AGENTS.md` status: Phase 1 → 🟡 (blocked on §2's 5 closeout items), Phase 2 → 🟡 (blocked on §3's 9 epics), Phase 3a → next after both close.
2. Do the Phase 1 closeout items (§2) — they're small and mostly verification, not new build.
3. Start Phase 2's Epic 2.1 (shared UI kit) — it blocks every other Phase 2 epic and all of Phase 3.
4. Run the Phase 3/3a/4 schema audits (§6 [3.0], §7 [4.0]) **before** writing any Phase 3a code — you have more schema than you think, and touching `enrollments` design once, correctly, now, is cheaper than discovering its shape is wrong after Phase 4 depends on it.