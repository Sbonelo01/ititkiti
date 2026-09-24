-- Event-scoped door team: organizers grant scanner access per event.

create table if not exists public.event_scanner_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid null,
  invited_email text not null,
  invited_by uuid not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null,
  constraint event_scanner_members_invited_email_lower check (invited_email = lower(trim(invited_email)))
);

create index if not exists idx_event_scanner_members_event_active
  on public.event_scanner_members (event_id)
  where revoked_at is null;

create index if not exists idx_event_scanner_members_user_active
  on public.event_scanner_members (user_id)
  where revoked_at is null and user_id is not null;

create unique index if not exists uq_event_scanner_members_event_email_active
  on public.event_scanner_members (event_id, invited_email)
  where revoked_at is null;

create unique index if not exists uq_event_scanner_members_event_user_active
  on public.event_scanner_members (event_id, user_id)
  where revoked_at is null and user_id is not null;

alter table public.event_scanner_members enable row level security;

revoke all on table public.event_scanner_members from anon, authenticated;
grant all on table public.event_scanner_members to service_role;

comment on table public.event_scanner_members is
  'Users allowed to scan tickets for a specific event. Managed via Tikiti API (service role).';
