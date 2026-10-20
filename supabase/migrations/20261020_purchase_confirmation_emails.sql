-- Idempotency log for the buyer purchase confirmation email.
-- One row per Paystack reference. The API claims the row before calling Brevo
-- and sets sent_at only after Brevo accepts the message. A failed send deletes
-- the unsent claim so a later attempt can retry.
-- Service role only. Clients cannot read or write this table.

create table if not exists public.purchase_confirmation_emails (
  reference text primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz null,
  provider_id text null
);

alter table public.purchase_confirmation_emails enable row level security;

revoke all on table public.purchase_confirmation_emails from public, anon, authenticated;
grant all on table public.purchase_confirmation_emails to service_role;

comment on table public.purchase_confirmation_emails is
  'One buyer confirmation email per Paystack payment reference. Written by the Tikiti API (service role) after a ticket purchase is finalized.';
