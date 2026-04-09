# Super Admin Edge Function Contract

Function name: `super-admin-ops`

Purpose:

- Enforce Option A backend-only service-role execution for cross-school super-admin operations.
- Keep privileged writes off client-side code.

## Actions currently implemented

- `dashboard.summary`
- `schools.list`
- `schools.create`
- `schools.set-status`
- `users.list`
- `users.invite`
- `users.set-status`
- `audit.list`

## Actions in progress

- Add richer filtering/pagination for very large tenant datasets
- Add direct auth-session revocation hooks when user status changes

## Request format

```json
{
  "action": "dashboard.summary",
  "payload": {}
}
```

Cursor-aware list actions accept `limit` and `cursor` in payload:

```json
{
   "action": "users.list",
   "payload": {
      "limit": 50,
      "cursor": "<opaque-cursor>"
   }
}
```

## Response format

```json
{
   "data": {
      "items": [],
      "next_cursor": null
   }
}
```

## Security model

- Caller must present a valid Supabase session token.
- Function validates caller profile role as `super_admin`.
- Function uses `SUPABASE_SERVICE_ROLE_KEY` for privileged access.
- Deactivating a user (`users.set-status` with `isActive=false`) now:
  - Sets auth ban duration for the account
  - Revokes active auth sessions immediately (forced logout)

## Local development notes

- Ensure function env vars are available: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Deploy or serve the function with `supabase functions deploy super-admin-ops`.
- Apply migrations: `src/db/migrations/015_create_platform_audit_events.sql` and `src/db/migrations/016_add_school_lifecycle_status.sql`.
