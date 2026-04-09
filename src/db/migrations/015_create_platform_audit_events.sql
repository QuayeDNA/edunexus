-- Platform audit stream for super-admin governance actions.
-- Safe to run multiple times.

create or replace function get_my_role()
returns text
language sql
stable
as $$
  select role from profiles where id = auth.uid()
$$;

create table if not exists platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id) on delete set null,
  actor_name text,
  action text not null,
  target_type text,
  target_id uuid,
  target_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_audit_created_at
  on platform_audit_events(created_at desc);

create index if not exists idx_platform_audit_action
  on platform_audit_events(action);

alter table platform_audit_events enable row level security;

drop policy if exists "Platform audit: super admin read" on platform_audit_events;

create policy "Platform audit: super admin read"
  on platform_audit_events
  for select
  using (coalesce(get_my_role() = 'super_admin', false));
