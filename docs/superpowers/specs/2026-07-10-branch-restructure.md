# EduNexus — Branch Restructure & CI Pipeline

> 2026-07-10

## Rationale

Prevent direct pushes to `main`, enforce a staging/verification step via `preview` before milestone merges reach production, and run CI on every code change.

## Branch Topology

```
main ── A ── L1           (clean, protected — first commit + landing page)
        \
preview ─ B ── ... ── Z ── L2 ── (all current work + landing page, day-to-day dev)

Workflow:
  feature-branch ──PR→ preview ──milestone PR→ main
```

- **`main`** — Clean release branch. Protected: requires PR with 1 approval, passing CI (lint/typecheck/test/build), and branches must be up to date. No direct pushes. Force pushes blocked.
- **`preview`** — Staging/integration branch. Protected: requires passing CI checks. Direct pushes allowed. Default branch on GitHub (all new PRs default here).
- **Feature branches** — Branch off `preview`, PR back to `preview`.

## CI Pipeline

`.github/workflows/ci.yml` — runs on:

- Push to `preview`
- Pull request targeting `preview` or `main`

Jobs (parallel): `lint` → `typecheck` → `test` → `build`

Each job: ubuntu-latest, pnpm 9, Node 20, `pnpm install --frozen-lockfile`, then the corresponding `turbo` script.

## Branch Protection

| Setting               | main                            | preview                         |
| --------------------- | ------------------------------- | ------------------------------- |
| Require PR            | ✅ (1 approval)                 | ❌                              |
| Require status checks | ✅ lint, typecheck, test, build | ✅ lint, typecheck, test, build |
| Strict (up-to-date)   | ✅                              | ❌                              |
| Enforce admins        | ✅                              | ❌                              |
| Force pushes          | ❌                              | ✅                              |

## Landing Page

`apps/web/app/page.tsx` renders a centered EduNexus hero (name, tagline, "Go to Login" button) instead of the previous `redirect('/login')`. This is the only commit on `main` beyond the initial foundation commit. The same page exists on `preview` with all other work.
