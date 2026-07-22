# EduNexus — Design System

> The "how." Read `01-DESIGN-PHILOSOPHY.md` first — every value here traces back to a decision made there. This is written against the actual repo state: Next.js 16, Tailwind v4 (CSS-first `@theme` config), shadcn/ui (7 primitives currently installed: avatar, badge, button, card, input, label, skeleton).

---

## 1. Typography

| Role | Face | Why | Google Fonts name |
|---|---|---|---|
| Display / ceremonial | **Fraunces** (variable) | Warm, editorial serif with real personality at large sizes — used only where a document is meant to feel signed/official (report cards, certificates, ID cards, portal welcome headers) | `Fraunces:opsz,wght@9..144,300..900` |
| Working / body | **IBM Plex Sans** | Built for dense technical UI, excellent legibility at 13–14px, humanist enough to stay warm | `IBM+Plex+Sans:wght@400;500;600;700` |
| Data / tabular | **IBM Plex Mono** | Tabular figures for IDs, index numbers, invoice numbers, GHS amounts in tables | `IBM+Plex+Mono:wght@400;500;600` |

**Explicitly not used:** Inter, Roboto, Open Sans, system-ui stack (the current `globals.css` default) — replace entirely, don't layer on top of.

**Type scale (Tailwind v4 `@theme`):**

```css
--text-display-lg: 3.5rem;   /* report card headline, portal welcome */
--text-display-md: 2.5rem;
--text-display-sm: 1.75rem;
--text-heading-lg: 1.5rem;   /* page titles */
--text-heading-md: 1.25rem;  /* section headers */
--text-heading-sm: 1.0625rem;
--text-body: 0.9375rem;      /* 15px — the actual workhorse size for dense tables/forms */
--text-caption: 0.8125rem;
--text-micro: 0.6875rem;     /* table meta, timestamps */

--leading-display: 0.95;
--leading-heading: 1.2;
--leading-body: 1.6;

--tracking-display: -0.02em;
--tracking-caption: 0.04em;
```

**Rule:** Fraunces never appears below 20px (it loses character at small sizes) and never in a data table. Plex Mono never appears in prose. Plex Sans never appears on a report card headline.

---

## 2. Color tokens

All defined in OKLCH for perceptually-even adjustments (needed later for the tenant-branding contrast auto-fix in §6). Approximate sRGB hex given alongside for quick reference.

```css
@theme {
  /* ground & surface — warm paper, not clinical white/grey */
  --color-ground:        oklch(97.5% 0.012 80);   /* ~#F7F4EC — warm paper */
  --color-surface:       oklch(99% 0.004 80);     /* ~#FDFCFA — card/panel, barely lifted off ground */
  --color-surface-muted: oklch(95% 0.014 80);     /* ~#EFEBE0 — nested panels */
  --color-surface-hover: oklch(93% 0.016 80);
  --color-border:        oklch(88% 0.014 75);     /* ~#DEDACE */
  --color-border-muted:  oklch(92% 0.012 75);

  /* ink — warm charcoal, never cold slate/indigo-black */
  --color-ink:            oklch(24% 0.018 55);    /* ~#2B2620 — primary text */
  --color-ink-secondary:  oklch(42% 0.016 55);    /* ~#5B5348 */
  --color-ink-muted:      oklch(62% 0.014 55);    /* ~#948C7E */
  --color-ink-inverse:    oklch(98% 0.006 80);

  /* role accents — see philosophy §4, used for wayfinding chrome only */
  --color-role-platform:  oklch(38% 0.012 250);   /* graphite — super_admin */
  --color-role-admin:     oklch(58% 0.135 75);    /* ochre/gold */
  --color-role-teacher:   oklch(34% 0.065 155);   /* chalkboard green */
  --color-role-student:   oklch(45% 0.13 255);    /* exercise-book blue */
  --color-role-parent:    oklch(55% 0.14 40);     /* terracotta */

  /* status — tuned, not bootstrap-default */
  --color-status-success: oklch(52% 0.13 148);
  --color-status-warning: oklch(72% 0.15 82);
  --color-status-danger:  oklch(50% 0.18 28);
  --color-status-info:    oklch(55% 0.075 250);

  /* tenant-brand — populated per-school at runtime, see §6. These are fallback defaults. */
  --color-tenant-accent:      var(--color-role-admin);
  --color-tenant-accent-dim:  color-mix(in oklch, var(--color-tenant-accent) 20%, transparent);

  --radius-sm: 0.25rem;   /* inputs, small chips */
  --radius-md: 0.5rem;    /* cards */
  --radius-lg: 0.875rem;  /* modals, elevated panels */
  --radius-full: 9999px;  /* pills, avatars */

  --shadow-ambient: 0 1px 2px oklch(30% 0.02 60 / 0.05);
  --shadow-card:    0 6px 20px -6px oklch(30% 0.02 60 / 0.10), 0 2px 6px -2px oklch(30% 0.02 60 / 0.06);
  --shadow-lifted:  0 20px 48px -12px oklch(30% 0.02 60 / 0.22);

  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
}
```

**Dark mode ("Night Register")** — a real second mode, not an inverted afterthought, for staff working evenings/early mornings:

```css
.dark {
  --color-ground:        oklch(18% 0.012 55);
  --color-surface:       oklch(22% 0.014 55);
  --color-surface-muted: oklch(26% 0.014 55);
  --color-border:        oklch(32% 0.014 55);
  --color-ink:            oklch(94% 0.01 75);
  --color-ink-secondary:  oklch(78% 0.012 70);
  --color-ink-muted:      oklch(58% 0.012 65);
  /* role accents shift lighter for AA contrast against dark ground — recompute, don't reuse light values */
  --color-role-admin:     oklch(70% 0.13 78);
  --color-role-teacher:   oklch(62% 0.09 155);
  --color-role-student:   oklch(68% 0.11 255);
  --color-role-parent:    oklch(68% 0.13 42);
}
```

**Banned, explicitly:** `#6366f1`, any Tailwind default `indigo-*`/`violet-*` as a primary brand color, `#10b981`/`emerald-*` as "the" accent, pure `#3b82f6` blue for links, `box-shadow: 0 4px 8px rgba(0,0,0,0.1)` (use the layered `--shadow-*` tokens above instead).

---

## 3. Component conventions (shadcn/ui)

Current repo has 7 primitives (`avatar`, `badge`, `button`, `card`, `input`, `label`, `skeleton`). Missing, and needed before Phase 3 UI work continues per the earlier audit: `dialog`, `select`, `tabs`, `dropdown-menu`, `sonner` (toast), `form`, `table` wrapper.

**When adding via `npx shadcn add`:** immediately re-point the generated component's classes from shadcn's default `zinc`/`slate` palette to this system's tokens — don't leave two color systems running in parallel. E.g. shadcn's default `bg-background text-foreground` should resolve to `--color-surface`/`--color-ink` via the Tailwind `@theme` mapping, not shadcn's own default scale.

**Buttons** — never a flat single-color rectangle:
- Primary: filled with the *current role's* accent (`--color-role-{role}` or `--color-tenant-accent` on front-of-house surfaces), `radius-full` (pill), subtle `--shadow-ambient`, hover darkens 8% via `color-mix`.
- Secondary: outline only, 1px `--color-border`, fills with `--color-surface-hover` on hover — no color fill.
- Destructive: outline by default (not filled red), only fills solid on the confirm step inside a `confirm-dialog`.
- Every button state (hover/focus/active/disabled) is explicitly styled — no relying on browser defaults or a single `:hover` opacity fade.

**Cards** — never "white box, shadow, radius, title+body":
- List-item cards (student card, staff card): a 4px left border in the record's relevant color (status or role-accent) replaces a drop shadow as the primary visual separator — a ledger-line, not a floating tile.
- Stat cards (dashboard summaries): the number is Fraunces at `--text-display-sm`, not a generic bold sans number — ties dashboards back to the "ceremonial document" thesis even in small doses.

**Tables** — this is the single most-used surface in the entire app; treat it like Tufte would, not like a generic admin template:
- Minimal chrome: hairline row dividers (`--color-border-muted`), no zebra striping by default (zebra striping is a crutch for bad column alignment — fix the alignment instead).
- Numeric columns (fees, scores, attendance %) always right-aligned, always Plex Mono, always tabular-nums.
- Row hover: `--color-surface-hover` background only, no shadow/lift.
- Sticky header on scroll for any table >15 rows.
- Inline sparkline (recharts, no axis/legend, 40×16px) next to a student's grade or attendance cell where a trend exists — this is a genuine differentiator; almost no competitor school SaaS shows trend-at-a-glance inside the table cell itself instead of a separate chart page.

**Forms:**
- Floating label pattern (label sits inside the input at rest, animates up on focus/filled) — not stacked label-above-input.
- Inline validation on blur, not only on submit.
- Multi-step forms (admissions wizard, school setup wizard) show progress as the Term-Ribbon color-block rhythm (§ philosophy 6), not a generic numbered stepper — reuses the signature motif instead of introducing a second pattern.

**Navigation:**
- Sidebar per portal (already exists per-role in the repo) — active state uses the role accent as a left-border + tinted background, not a filled pill (filled pills read as "buttons," sidebars should read as "location").
- Term Ribbon (§ philosophy 6) sits above the sidebar/header in every portal — this is the one piece of chrome shared byte-for-byte across all 5 role shells.

---

## 4. Motion

Restrained, purposeful, matches the "ledger" register — not a marketing site with scroll-triggered reveals.

```css
--duration-fast: 120ms;
--duration-base: 200ms;
--duration-slow: 350ms;
```

- Page/route transitions: none by default — a working data tool should feel instant, not choreographed. (This deliberately breaks from `artisan-ui`'s marketing-site guidance — a dense CRUD app is a different brief than a landing page, and instant navigation is the correct choice here.)
- Micro-interactions only: button press (scale 0.98, `--duration-fast`), dialog enter/exit (fade + 8px translate, `--duration-base`, `--ease-out-expo`), toast enter (slide from bottom-right + fade), skeleton shimmer (already have `skeleton.tsx` — keep, it's the right primitive).
- The **one** deliberate choreographed moment in the whole product: the Term Ribbon's color-block bands animate in sequence (left to right, 40ms stagger) on first paint of a session — echoing a ledger being opened. Everywhere else, motion should be invisible unless you're looking for it.
- `prefers-reduced-motion: reduce` — respected everywhere, no exceptions, including the Term Ribbon's entrance.

---

## 5. Print / document design system

Report cards, ID cards, transfer certificates, payslips, and invoices currently risk being built ad hoc per feature (separate jsPDF layouts in issues #34, #45, #56, #82, #124 per the roadmap). **Consolidate into one shared document-rendering module** before any more of these ship:

- `packages/documents/` (new package) — a shared `<DocumentShell>` React-to-PDF template (or HTML-to-PDF via a headless render) providing: school header block (logo + name + GES reg number, pulled from `schools.config`), Fraunces-set title, ink/paper colors *regardless of the user's dark-mode preference* (a printed document is always "light mode" — paper is paper), a consistent footer (generated date, page number, EduNexus attribution mark).
- Each document type (report card, ID card, certificate, payslip, invoice) is a template that fills this shell, not a bespoke PDF built from scratch.
- Tenant branding (§6) is allowed here: school logo and the tenant accent color as a trim/border color on official documents — this is the highest-value, lowest-risk place to let a school's brand show through, since these documents already carry the school's identity in real life (letterhead, stamp).

---

## 6. Multi-tenant theming architecture (the differentiation feature)

This is the technical backbone for "customizable design system scoped to schools and branding" — designed so it's safe by construction, not by admin discipline.

**Data:** `schools.config` (jsonb, already exists in the current schema) gains a `branding` key:
```json
{ "branding": { "primaryColor": "#0B5D3B", "logoUrl": "...", "wordmark": "Accra Academy" } }
```

**Server-side scale generation (new small utility, `packages/shared/src/utils/tenant-theme.ts`):**
1. Parse the school's chosen `primaryColor` into OKLCH.
2. Programmatically check contrast against `--color-ground` (light) and `--color-ground` dark variant — if it fails AA (4.5:1) at the intended lightness, **adjust lightness only** (never hue) until it passes, and surface a warning in the school setup wizard ("Your color was adjusted slightly for readability — here's the preview") rather than silently failing or silently ignoring the request.
3. Emit a small CSS custom property block, scoped via a `data-tenant` attribute on the root layout for that subdomain:
   ```css
   [data-tenant="accra-academy"] {
     --color-tenant-accent: oklch(48% 0.14 155);
     --color-tenant-accent-dim: color-mix(in oklch, var(--color-tenant-accent) 20%, transparent);
   }
   ```
4. This is rendered as an inline `<style>` tag in the tenant `layout.tsx` (Server Component, reads `schools.config` once per request via the existing tenant-resolution middleware) — no client-side theme-switcher needed, no FOUC, no extra request.

**Scope of what tenant color touches (see philosophy §9 for the reasoning):**
- ✅ Login page accent, student/parent portal header tint, announcement banner, generated document trim (§5).
- ❌ Admin/teacher/super_admin internal chrome (stays on role-accent system, §2) — a school's brand color never overrides the wayfinding system staff rely on.
- ❌ Status colors (success/warning/danger) — never overridden, ever, regardless of tenant.

**Setup wizard integration:** this plugs directly into Phase 3.7.2 (School Setup Wizard, step "Branding") already in `ROADMAP.md` — the wizard's branding step should show a **live preview** of the login page and a sample report card with the chosen color applied and contrast-corrected in real time, not just a color swatch.

---

## 7. Tailwind v4 / Next.js 16 technical notes

- Keep the CSS-first `@theme` approach already in use (correct choice for Tailwind v4, don't regress to a `tailwind.config.ts` JS config).
- Load Fraunces/Plex Sans/Plex Mono via `next/font/google` with `display: 'swap'`, subset to `latin` only initially (add `latin-ext` only if a supported curriculum needs it).
- Use `font-feature-settings: "tnum" 1, "kern" 1` on any element rendering tabular data (fee tables, gradebooks) to force tabular figures even mid-paragraph.
- Dark mode: class-based (`.dark` on `<html>`), toggled via a simple `useTheme` hook + `localStorage`-free approach (persist preference server-side on the `profiles` table as a user setting, since Dexie/offline users shouldn't lose their preference) — do not use `localStorage`/`sessionStorage` directly per this environment's artifact constraints if this component is ever prototyped as an Artifact; the production Next.js app has no such restriction, but keep the persistence server-side regardless for cross-device consistency.