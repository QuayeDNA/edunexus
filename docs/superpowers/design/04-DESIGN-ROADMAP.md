# EduNexus — Design Roadmap

> Uses the same issue template as `ROADMAP.md` (§2 there), namespaced `[D-#]` to avoid colliding with real GitHub issue numbers already assigned to feature work. Cross-references feature issues where relevant. **Read the sequencing warning in §0 before doing anything else — it changes what "Phase 8 — Design System" in the existing roadmap actually means.**

---

## 0. Sequencing warning — this is a retrofit, not a green-field system

The existing `ROADMAP.md` schedules "Design System & Polish" as **Phase 8**, after Admin/Teacher/Student/Parent portals are built, framed as a polish pass applied to already-existing screens. That ordering made sense when "design system" meant *responsive/a11y/empty-state audit*. It does not make sense for what's being asked now: a **foundational, opinionated visual identity** — because by the time Phase 8 arrives, issues #28, #29, #30, #32, #35, #48, #49, #50, #51, and all of Phase 3a's admissions flow will already be shipped and in production, built against the current generic `globals.css` (Inter, indigo-500, emerald-500).

**Two things need to happen in parallel, not in sequence:**

1. **Phase D0 (below) needs to happen now**, before any more new screens are built (i.e., before Phase 3's remaining epics 3.1.4, 3.2.2, 3.2.3, 3.3.2, 3.3.3, 3.4, 3.5, 3.6 continue) — every new screen built from this point forward should use the real tokens, not the placeholder ones.
2. **Phase D1 is a scoped retrofit** of what's already shipped — don't let this balloon into "redesign everything at once." Budget it as its own small epic with its own PRs, screen by screen, same Small-Task Workflow already defined in `AGENTS.md`.

The original Phase 8 (§9 in `ROADMAP.md`: design tokens, animation, responsive/a11y audit) is **superseded by D0–D2 below** for the tokens/animation parts; its responsive audit (8.3) and accessibility audit (8.4) items remain valid as-is and are cross-referenced here rather than duplicated.

---

## 1. Phase D0 — Design Foundation (do first, blocks new UI work)

**Goal:** replace the generic token system and core primitives before another feature screen ships.
**Timeline:** 3–5 days — this is deliberately small and fast, not a redesign sprint.

- **[D0.1] Replace `globals.css` token set**
  - Depends on: none
  - Tasks: implement the full `@theme` block from `02-DESIGN-SYSTEM.md §2` (color, radius, shadow tokens); add `next/font/google` loaders for Fraunces/IBM Plex Sans/IBM Plex Mono; remove Inter entirely.
  - AC: Given the token replacement is merged, when any existing page renders, then no visual regression occurs that wasn't intentional (i.e., colors change as designed, layout doesn't break) — verified via a before/after screenshot diff on the 5 existing role dashboards.

- **[D0.2] Dark mode scaffold ("Night Register")**
  - Depends on: D0.1
  - Tasks: `.dark` class toggle, persisted server-side on `profiles` (new `themePreference` column), `useTheme` hook, verify contrast on both modes for all 5 role accents.
  - AC: Toggling dark mode from any portal persists across a full logout/login cycle and across devices for the same user.

- **[D0.3] Upgrade shadcn primitives**
  - Depends on: D0.1
  - Tasks: add `dialog`, `select`, `tabs`, `dropdown-menu`, `sonner`, `form`, `table` via shadcn CLI; re-point each from shadcn's default zinc/slate scale to this system's tokens (see System doc §3) — do this at add-time, not as a follow-up cleanup.
  - AC: A demo/story page shows all 14 primitives rendered together with consistent token usage, no leftover `zinc-*`/`slate-*` Tailwind classes in any component file.

- **[D0.4] Build the Term Ribbon component**
  - Depends on: D0.1, D0.3
  - Tasks: cross-portal component reading current academic year/term from `academicYears`/`terms` (already exist); renders role-accent color-block rhythm; click-to-expand calendar detail; entrance animation (System doc §4).
  - AC: Renders correctly in all 5 role shells with the correct role accent per shell; expand/collapse works via mouse and keyboard; respects `prefers-reduced-motion`.

- **[D0.5] Extract shared UI primitives that don't yet exist**
  - Depends on: D0.3
  - Tasks: `data-table.tsx`, `confirm-dialog.tsx`, `empty-state.tsx`, `page-header.tsx`, `stat-card.tsx` — this is the same work as `Phase 2 Epic 2.1` in the earlier audit doc; if that work has already started, coordinate rather than duplicate. Build each using D0.1's tokens from the start.
  - AC: Same as Phase 2 Epic 2.1's AC in the audit doc — don't relax it here.

---

## 2. Phase D1 — Retrofit already-shipped screens

**Goal:** bring merged screens up to the new system without a big-bang rewrite.
**Timeline:** ongoing, budget 1 screen-group per week alongside feature work.

- **[D1.1] Admissions flow retrofit** — issues #48, #49, #50, #51
  - Tasks: public application form (tenant-branded per System §6), admissions review queue (admin accent), status-change emails re-copywritten per Philosophy §8 tone rules.
- **[D1.2] Academic structure CRUD retrofit** — issues #28, #29, #30
  - Tasks: academic years/terms, grade levels/classes, subjects screens — re-skin with new tokens, adopt `data-table` (D0.5) for all list views.
- **[D1.3] Students module retrofit** — issue #32 (list/detail/edit)
  - Tasks: apply the card convention (System §3 — left-border accent, not shadow-box) to student list cards; detail page tabs use new `tabs` primitive (D0.3).
- **[D1.4] Staff module retrofit** — issue #35
  - Tasks: same pattern as D1.3, staff-specific fields.

**Note:** each of these is small enough to be one PR under the existing Small-Task Workflow — resist the temptation to combine them into one "design retrofit" mega-PR.

---

## 3. Phase D2 — Signature moments & document system

**Goal:** ship the things that make EduNexus recognizably itself, not just re-themed.
**Timeline:** 1–2 weeks, can run parallel to Phase 3's remaining feature work.

- **[D2.1] `packages/documents` shared rendering module** (System doc §5)
  - Depends on: D0.1
  - Tasks: `<DocumentShell>` template; migrate existing/planned document generators (ID cards #34, payslips #45, report cards #56, transfer certificates from #124, WAEC/GES exports #80/#81) to use it instead of ad hoc jsPDF per feature.
  - AC: All 5 document types render through the shared shell; adding a 6th document type (e.g., a future certificate) requires no changes to the shell itself, only a new template.
- **[D2.2] Report card ceremonial treatment**
  - Depends on: D2.1, issue #56
  - Tasks: Fraunces headline, school logo + tenant accent trim, headteacher signature block, GES-format compliance (issue #82) layered on top of the shared shell, not instead of it.
- **[D2.3] ID card + QR generation polish**
  - Depends on: D2.1, issue #34
  - Tasks: apply shell + role-neutral (student-facing) styling; verify print layout (8-per-page grid) still works with new document tokens.

---

## 4. Phase D3 — Tenant theming system

**Goal:** ship the actual "customizable branding" differentiation feature.
**Timeline:** 1 week, sequenced to land alongside issue #129 (School Setup Wizard).

- **[D3.1] OKLCH scale + contrast-correction utility**
  - Depends on: D0.1
  - Tasks: `packages/shared/src/utils/tenant-theme.ts` per System doc §6; unit tests covering the "input color fails contrast → auto-adjusted" path explicitly, not just the happy path.
  - AC: Given a school picks a brand color with contrast ratio 2.1:1 against paper ground, when the utility runs, then it returns an adjusted color with contrast ≥ 4.5:1 and a boolean flag `wasAdjusted: true`.
- **[D3.2] Branding step in School Setup Wizard** — issue #129
  - Depends on: D3.1
  - Tasks: color picker, live preview pane (login page + report card corner), adjustment notice UI copy per Philosophy §8.
  - AC: See User Flows doc, Flow 2.
- **[D3.3] Tenant `<style>` injection in tenant layout**
  - Depends on: D3.1
  - Tasks: Server Component reads `schools.config.branding`, emits scoped custom properties (System §6) — verify no FOUC via SSR-only rendering, no client-side theme flash.
  - AC: Given two schools with different brand colors are viewed in adjacent browser tabs, then each renders its own tenant accent with no bleed-through or flash of the other school's/default color.

---

## 5. Phase D4 — Portal-specific tonal variation

**Goal:** make each of the 5 role shells feel distinctly like "their" space while sharing one system.
**Timeline:** interleaved with Phase 4/5/6 feature work (Teacher/Student/Parent portals).

- **[D4.1] Teacher portal chrome** — depends on Phase 4 screens existing
- **[D4.2] Student portal chrome** — depends on Phase 5 screens existing
- **[D4.3] Parent portal chrome** — depends on Phase 6 screens existing, plus D3 (tenant branding shows up here per User Flows Flow 4)

Each is: apply role accent to sidebar/header, verify Term Ribbon renders correctly in that shell, verify dark mode, verify the role's dashboard stat-cards use Fraunces numerals per System §3.

---

## 6. Phase D5 — Motion & interaction pass

**Maps directly to `ROADMAP.md` [8.2]** — superseded in scope (not duplicated): the *system* for motion is defined in `02-DESIGN-SYSTEM.md §4` now, so this phase becomes an **audit-and-apply** pass, not a from-scratch design task.

- **[D5.1] Apply motion tokens across all existing components** — verify no component invented its own transition timing outside `--duration-*`/`--ease-*`.
- **[D5.2] Term Ribbon entrance polish** — the one deliberate choreographed moment (Philosophy §6); everything else should already be minimal per D0.4.

---

## 7. Phase D6 — Accessibility & responsive audit

**Directly reuses `ROADMAP.md` [8.3] and [8.4]** — no new epics needed here, just executed against the new system instead of the old one. Add one D-specific AC on top of the existing ones:

- **[D6.1]** Given any role-accent or tenant-accent color is used as the sole indicator of state (e.g., a colored dot with no label), then it must be paired with text or an icon — audit every instance introduced by D0–D4 specifically, since a new palette is exactly when contrast/color-only mistakes get introduced.

---

## 8. Phase D7 — Document system rollout completion

**Goal:** every remaining PDF-producing feature in the existing roadmap uses `packages/documents` (D2.1), none built ad hoc.

- **[D7.1] Timetable PDF export** — issue #39, migrate to shared shell.
- **[D7.2] Invoices & fee statements** — issues #40–#43, migrate.
- **[D7.3] WAEC/GES compliance exports** — issues #80, #81, #82 — these are data exports (CSV) more than documents, but where a PDF rendering is involved (e.g., a printable enrollment census), route it through the shell too.

---

## 9. Design Definition of Done (add to the existing one in the audit doc)

Every UI-touching PR, regardless of which phase, must additionally satisfy:

- [ ] No raw hex color in component code — every color is a token (`--color-*` or a role/tenant accent variable)
- [ ] No `Inter`/system-ui font-family declared anywhere
- [ ] New tables use `data-table` (D0.5), not a bespoke `<table>`
- [ ] New generated PDFs go through `packages/documents` (D2.1), not a standalone jsPDF call
- [ ] Dark mode checked, not just assumed to inherit correctly
- [ ] Keyboard-only pass done on any new interactive component