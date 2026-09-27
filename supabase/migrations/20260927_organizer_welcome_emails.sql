-- Idempotency log for the organizer onboarding email.
-- One row per listed event. The API claims the row before calling Brevo
-- and sets sent_at only after Brevo accepts the message.
-- Service role only. Clients cannot read or write this table.

create table if not exists public.organizer_welcome_emails (
  event_id uuid primary key references public.events(id) on delete cascade,
  organizer_id uuid not null,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz null,
  provider_id text null
);

alter table public.organizer_welcome_emails enable row level security;

revoke all on table public.organizer_welcome_emails from public, anon, authenticated;
grant all on table public.organizer_welcome_emails to service_role;

comment on table public.organizer_welcome_emails is
  'One organizer onboarding email per event. Written by the Tikiti API (service role) when an event is listed.';
