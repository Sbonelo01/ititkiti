-- Not applied by the application. Review and apply manually.
-- Merging this file does not change production.
--
-- event_scanner_members may already exist (RLS enabled, no policies) from
-- 20260925. This migration only adds missing invite columns, a generated
-- status, active-row uniqueness, and service-role grants.
-- It does not reference public.events or auth.users. Those tables are not
-- created by this repository's migrations.

create table if not exists public.event_scanner_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  user_id uuid,
  invited_email text,
  invited_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.event_scanner_members
  add column if not exists event_id uuid;

alter table public.event_scanner_members
  add column if not exists user_id uuid;

alter table public.event_scanner_members
  add column if not exists invited_email text;

alter table public.event_scanner_members
  add column if not exists invited_by uuid;

alter table public.event_scanner_members
  add column if not exists created_at timestamptz default now();

alter table public.event_scanner_members
  add column if not exists revoked_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'event_scanner_members_invited_email_lower'
      and conrelid = 'public.event_scanner_members'::regclass
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.event_scanner_members
    where invited_email is not null
      and invited_email is distinct from lower(trim(invited_email))
  ) then
    raise notice 'event_scanner_members: skipped lowercase email check; existing rows are not normalized';
    return;
  end if;

  alter table public.event_scanner_members
    add constraint event_scanner_members_invited_email_lower
    check (invited_email is null or invited_email = lower(trim(invited_email)));
end $$;

-- Derived so pending / active / removed cannot drift from user_id and revoked_at.
-- Application code derives the same value and does not write this column,
-- so deploys work before this migration is applied.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_scanner_members'
      and column_name = 'status'
  ) then
    return;
  end if;

  alter table public.event_scanner_members
    add column status text
    generated always as (
      case
        when revoked_at is not null then 'removed'
        when user_id is not null then 'active'
        else 'pending'
      end
    ) stored;
end $$;

create index if not exists idx_event_scanner_members_event_active
  on public.event_scanner_members (event_id)
  where revoked_at is null;

create index if not exists idx_event_scanner_members_user_active
  on public.event_scanner_members (user_id)
  where revoked_at is null and user_id is not null;

do $$
begin
  create unique index if not exists uq_event_scanner_members_event_email_active
    on public.event_scanner_members (event_id, invited_email)
    where revoked_at is null and invited_email is not null;
exception
  when unique_violation then
    raise notice 'event_scanner_members: skipped email uniqueness; duplicate active rows exist';
end $$;

do $$
begin
  create unique index if not exists uq_event_scanner_members_event_user_active
    on public.event_scanner_members (event_id, user_id)
    where revoked_at is null and user_id is not null;
exception
  when unique_violation then
    raise notice 'event_scanner_members: skipped user uniqueness; duplicate active rows exist';
end $$;

alter table public.event_scanner_members enable row level security;

revoke all on table public.event_scanner_members from public;
revoke all on table public.event_scanner_members from anon;
revoke all on table public.event_scanner_members from authenticated;
grant all on table public.event_scanner_members to service_role;

comment on table public.event_scanner_members is
  'Per-event scanner invites. Pending until a verified sign-in links user_id. Server access is service_role only; there are no client policies.';

comment on column public.event_scanner_members.invited_email is
  'Normalized invite address (trimmed, lowercase).';
