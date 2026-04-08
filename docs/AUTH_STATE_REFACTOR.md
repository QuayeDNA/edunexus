# Auth State Refactor (April 2026)

## Why this refactor was needed

The previous flow could deadlock route access when:

- session restoration succeeded,
- profile fetch timed out or retried slowly,
- route guards still required `role` before rendering protected routes.

This produced long loading screens on hard refresh and HMR.

## Core changes

### 1) Session state and profile state are now separate

`AuthContext` now tracks:

- `initialized`: session bootstrap completed
- `loading`: legacy compatibility flag (`!initialized`)
- `profileStatus`: `idle | loading | ready | missing | error`
- `profileError`: last profile fetch error

This prevents role-dependent guards from waiting forever on one generic loading flag.

### 2) Cache-first profile hydration

On `INITIAL_SESSION`:

- if a cache exists for the same user, profile is hydrated immediately,
- UI becomes interactive without blocking on network,
- profile is only re-fetched if cache is stale.

### 3) Resilient profile fetch strategy

Profile loading now has:

- timeout: 8s
- retries: 2 with backoff
- in-flight deduplication per user
- non-destructive failure behavior (keeps last known good profile)

A transient timeout no longer wipes role/school context and no longer traps users on spinners.

### 4) Guard-level recovery UX

`ProtectedRoute`, `AuthLayout`, and `OnboardingGuard` now:

- show explicit profile-loading screens,
- show recovery actions (`Retry` / `Sign out`) on profile errors,
- avoid silent or indefinite blank/loading states.

### 5) API profile fetch cleanup

`authApi.getProfile` now uses `maybeSingle()` and throws only real query errors.
This removes noisy no-row exception handling and simplifies caller behavior.

## Frontend auth flow (new)

1. Supabase emits `INITIAL_SESSION`.
2. Session user is restored.
3. Cached profile (if same user) is applied immediately.
4. App is marked initialized.
5. Profile refresh runs only when cache is stale.
6. Guards decide access using `role` and `profileStatus`.

## Backend auth/RLS assessment

### What is correct

- Supabase session persistence (`persistSession: true`) is correctly enabled.
- Profile self-access policies are non-recursive and safe:

  - `Profiles: read own`
  - `Profiles: update own`
  - `Profiles: insert own`

### What remains important

- Ensure `src/db/migrations/001_fix_auth_rls.sql` has been applied in Supabase.
- Keep profile reads limited to own profile in client-side auth bootstrap.
- Keep school-wide profile listing (if needed later) behind a trusted backend/service role, not client RLS recursion.

## Runtime behavior you should now see

- Hard refresh while signed in should not freeze on a global loading screen.
- If profile sync is slow/fails, user sees a recovery card instead of an infinite spinner.
- Repeated hot reloads should not continuously block navigation on profile fetch latency.

## Next optional hardening

- Add metrics counters for profile fetch latency/timeouts in production logs.
- Add e2e test: refresh during slow profile response still reaches dashboard using cache.
- Add background profile refresh interval only when tab is visible.
