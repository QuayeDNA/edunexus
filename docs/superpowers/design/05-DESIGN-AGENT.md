# EduNexus — Design Agent Instructions

> Extends `AGENTS.md`. Read this before touching any file under `apps/web/components/`, `apps/web/app/**/page.tsx`, or `apps/web/app/globals.css`. This file exists because a generic design is the *default* output of writing UI quickly — these rules are the guardrail against that default, not a style suggestion.

---

## 0. Read order for any UI task

1. `docs/design/01-DESIGN-PHILOSOPHY.md` — the why, especially §4 (role accents) and §5 (appropriation guardrail — non-negotiable)
2. `docs/design/02-DESIGN-SYSTEM.md` — the tokens and component conventions to actually use
3. `docs/design/03-USER-FLOWS.md` — if the task touches one of the documented flows, follow its design-specific notes exactly
4. `docs/design/04-DESIGN-ROADMAP.md` — confirm which phase (D0–D7) the task belongs to and what its dependencies are
5. Only then: `/mnt/skills/public/frontend-design/SKILL.md` and the `artisan-ui` skill for general craft principles — this project's own docs take precedence where they're more specific (e.g., this project's motion philosophy in System §4 deliberately overrides `artisan-ui`'s marketing-site motion guidance for a dense CRUD app)

---

## 1. Hard bans — grep for these before opening a PR

If any of the following appear in a diff touching UI, stop and fix before requesting review:

| Banned | Why | Use instead |
|---|---|---|
| `Inter`, `Roboto`, `Open Sans`, `system-ui` as a primary font stack | The generic default this system was built to replace | Fraunces / IBM Plex Sans / IBM Plex Mono (System §1) |
| `#6366f1`, `indigo-500`, `violet-*` as a primary/brand color | The exact "AI tell" this codebase started with | `--color-role-*` or `--color-tenant-accent` |
| `#10b981`, `emerald-*` as "the" accent | Generic SaaS teal/green default | Role accents (System §2) |
| Raw hex codes in component `className` or inline styles | Breaks tenant theming and dark mode | CSS custom property tokens only |
| `box-shadow: 0 4px 8px rgba(0,0,0,0.1)` or any bare `rgba` shadow | Boilerplate, doesn't match the paper/ink aesthetic | `--shadow-ambient` / `--shadow-card` / `--shadow-lifted` |
| Zebra-striped tables as the default | Crutch for misaligned columns | Fix alignment; hairline dividers only (System §3) |
| A generic numbered stepper (`Step 1 of 7`) in any multi-step form | We have an actual signature motif for this | Term Ribbon color-block progress (System §3, Flows §2) |
| Literal kente/adinkra imagery used decoratively | Appropriation risk, explicitly banned | See Philosophy §5 — structural color-blocking only, and only in the specific chrome elements named there |
| `localStorage`/`sessionStorage` for theme or user preference | Doesn't survive device switches, breaks in any Artifact-based prototyping of this UI | Persist to `profiles` table server-side |

---

## 2. Role-accent discipline

The 5 role accents (`--color-role-platform/admin/teacher/student/parent`) exist for **wayfinding**, not decoration. Before using one, check:

- Is this element helping someone answer "whose portal am I in / whose eyes am I looking through"? → correct use (sidebar, header tint, Term Ribbon, impersonation banner).
- Is this element communicating success/warning/danger/info? → **wrong**, use the status scale instead, even if it happens to be inside that role's portal.
- Is this a tenant-branded front-of-house surface (login, public application form, parent payment screen, generated documents)? → use `--color-tenant-accent`, not the role accent (Philosophy §9, System §6).

When in doubt, re-read Philosophy §4 and §9 rather than guessing — the two systems (role accent vs. tenant accent) are deliberately scoped to different surfaces and mixing them up undermines the reason either exists.

---

## 3. Tenant theming safety rules (non-negotiable, not a style preference)

Because school admins will eventually be able to pick their own brand color (Phase D3), any code that touches tenant color must:

1. Never render a school's raw chosen color directly — always pass it through the contrast-correction utility (`packages/shared/src/utils/tenant-theme.ts`) first, even in a quick internal tool or admin preview.
2. Never let tenant color leak into admin/teacher/super_admin internal chrome, status colors, or accessibility-mandated UI (focus rings, error text) — these are hard-scoped in System §6 to specific front-of-house surfaces only.
3. If you're building a new surface and unsure whether it's "front-of-house" (tenant-brandable) or "back-of-house" (role-accent only), default to back-of-house/role-accent — it's the safer default, and easy to loosen later; the reverse (a tenant color that's crept into somewhere it shouldn't be) is a harder bug to find and fix later.

---

## 4. Review checklist for any UI PR

Adapted from `artisan-ui`'s Phase 8 checklist, tuned for this being a dense app, not a landing page:

- [ ] No item from the §1 hard-ban table appears in the diff
- [ ] Every color used resolves to a token, traceable to `02-DESIGN-SYSTEM.md §2`
- [ ] If the screen has a table, it follows System §3's table conventions (no zebra striping, numeric columns right-aligned + Plex Mono, sticky header if >15 rows)
- [ ] If the screen generates a document (PDF), it uses `packages/documents`'s shared shell (D2.1), not a standalone template
- [ ] Dark mode checked visually, not assumed
- [ ] Keyboard navigation works for every new interactive element
- [ ] `prefers-reduced-motion` respected if any animation was added
- [ ] If tenant branding is involved anywhere on this screen, the contrast-correction utility was used, not a raw color pass-through
- [ ] Copy on this screen (labels, empty states, error messages) was checked against Philosophy §8's tone rules — active voice, no invented cheerfulness around money/academic underperformance, empty states as invitations not error dumps

---

## 5. When a task doesn't fit neatly into an existing pattern

This system is deliberately specific, which means new situations will come up that aren't covered verbatim. When that happens:

1. Re-read Philosophy §2 and §3 (the subject-grounding and the "Register" thesis) and ask what a real Ghanaian school administrator's physical equivalent of this screen/document/interaction would be — that's usually where the answer is, not in a generic SaaS pattern library.
2. If the answer genuinely isn't in the existing docs, propose the addition as an update to `02-DESIGN-SYSTEM.md` (not a one-off exception in the component itself) so the next person building something similar inherits the decision instead of re-deriving it.
3. Never fall back to a generic pattern (indigo button, zebra table, stacked-label form) "just to ship something" — per `AGENTS.md`'s existing Small-Task Workflow, it's fine to take an extra small task to get the design-system-correct version right the first time.
