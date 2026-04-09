-- Enable/normalize schema + RLS policies required for communication module tables.
-- Safe to run multiple times.

create or replace function get_my_school_id()
returns uuid
language sql
stable
as $$
  select school_id from profiles where id = auth.uid()
$$;

create or replace function get_my_role()
returns text
language sql
stable
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_admin_or_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(get_my_role() in ('admin', 'super_admin'), false)
$$;

create or replace function can_send_school_messages()
returns boolean
language sql
stable
as $$
  select coalesce(get_my_role() in ('admin', 'super_admin', 'teacher'), false)
$$;

-- Communication tables (created if missing)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  title text not null,
  body text not null,
  audience text[],
  priority text default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  publish_at timestamptz default now(),
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  subject text,
  body text not null,
  sender_id uuid references profiles(id),
  recipient_ids uuid[],
  channels text[],
  status text default 'Queued',
  sent_at timestamptz,
  delivery_report jsonb
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text not null,
  body text,
  type text,
  is_read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  category text,
  default_audience text default 'All',
  default_channels text[] default array['in_app']::text[],
  subject text,
  body text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Messaging table enhancements
alter table messages add column if not exists audience_type text default 'All';
alter table messages add column if not exists class_id uuid references classes(id);
alter table messages add column if not exists scheduled_for timestamptz;
alter table messages add column if not exists created_at timestamptz default now();

-- Helpful indexes for communication lookups
create index if not exists idx_announcements_school_publish on announcements(school_id, publish_at desc);
create index if not exists idx_announcements_school_expires on announcements(school_id, expires_at);
create index if not exists idx_messages_school_created on messages(school_id, created_at desc);
create index if not exists idx_messages_school_status_schedule on messages(school_id, status, scheduled_for);
create index if not exists idx_messages_sender_id on messages(sender_id);
create index if not exists idx_messages_class_id on messages(class_id);
create index if not exists idx_notifications_user_read_created on notifications(user_id, is_read, created_at desc);
create index if not exists idx_templates_school_name on message_templates(school_id, name);

-- Enable row level security
alter table announcements enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table message_templates enable row level security;

-- Clear old policy variants first

drop policy if exists "School isolation: announcements" on announcements;
drop policy if exists "announcements_read" on announcements;
drop policy if exists "Announcements: school read" on announcements;
drop policy if exists "Announcements: admin insert" on announcements;
drop policy if exists "Announcements: admin update" on announcements;
drop policy if exists "Announcements: admin delete" on announcements;

drop policy if exists "School isolation: messages" on messages;
drop policy if exists "Messages: school select" on messages;
drop policy if exists "Messages: sender insert" on messages;
drop policy if exists "Messages: sender admin update" on messages;
drop policy if exists "Messages: sender admin delete" on messages;

drop policy if exists "Notifications: own only" on notifications;
drop policy if exists "Notifications: own select" on notifications;
drop policy if exists "Notifications: own update" on notifications;
drop policy if exists "Notifications: school sender insert" on notifications;
drop policy if exists "Notifications: admin delete" on notifications;

drop policy if exists "Message templates: school read" on message_templates;
drop policy if exists "Message templates: admin insert" on message_templates;
drop policy if exists "Message templates: admin update" on message_templates;
drop policy if exists "Message templates: admin delete" on message_templates;

-- Announcements policies
create policy "Announcements: school read"
  on announcements for select
  using (school_id = get_my_school_id());

create policy "Announcements: admin insert"
  on announcements for insert
  with check (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
    and (created_by is null or created_by = auth.uid())
  );

create policy "Announcements: admin update"
  on announcements for update
  using (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
  )
  with check (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
    and (created_by is null or created_by = auth.uid())
  );

create policy "Announcements: admin delete"
  on announcements for delete
  using (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
  );

-- Messages policies
create policy "Messages: school select"
  on messages for select
  using (
    school_id = get_my_school_id()
    and (
      is_admin_or_super_admin()
      or sender_id = auth.uid()
      or auth.uid() = any(coalesce(recipient_ids, '{}'::uuid[]))
    )
  );

create policy "Messages: sender insert"
  on messages for insert
  with check (
    school_id = get_my_school_id()
    and sender_id = auth.uid()
    and (class_id is null or class_id in (
      select id from classes where school_id = get_my_school_id()
    ))
    and not exists (
      select 1
      from unnest(coalesce(recipient_ids, '{}'::uuid[])) as rid
      where rid not in (
        select id from profiles where school_id = get_my_school_id()
      )
    )
  );

create policy "Messages: sender admin update"
  on messages for update
  using (
    school_id = get_my_school_id()
    and (sender_id = auth.uid() or is_admin_or_super_admin())
  )
  with check (
    school_id = get_my_school_id()
    and (class_id is null or class_id in (
      select id from classes where school_id = get_my_school_id()
    ))
    and not exists (
      select 1
      from unnest(coalesce(recipient_ids, '{}'::uuid[])) as rid
      where rid not in (
        select id from profiles where school_id = get_my_school_id()
      )
    )
  );

create policy "Messages: sender admin delete"
  on messages for delete
  using (
    school_id = get_my_school_id()
    and (sender_id = auth.uid() or is_admin_or_super_admin())
  );

-- Notifications policies
create policy "Notifications: own select"
  on notifications for select
  using (user_id = auth.uid());

create policy "Notifications: own update"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Notifications: school sender insert"
  on notifications for insert
  with check (
    can_send_school_messages()
    and user_id in (
      select id from profiles where school_id = get_my_school_id()
    )
  );

create policy "Notifications: admin delete"
  on notifications for delete
  using (
    is_admin_or_super_admin()
    and user_id in (
      select id from profiles where school_id = get_my_school_id()
    )
  );

-- Message templates policies
create policy "Message templates: school read"
  on message_templates for select
  using (school_id = get_my_school_id());

create policy "Message templates: admin insert"
  on message_templates for insert
  with check (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
    and (created_by is null or created_by = auth.uid())
  );

create policy "Message templates: admin update"
  on message_templates for update
  using (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
  )
  with check (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
    and (created_by is null or created_by = auth.uid())
  );

create policy "Message templates: admin delete"
  on message_templates for delete
  using (
    school_id = get_my_school_id()
    and is_admin_or_super_admin()
  );
