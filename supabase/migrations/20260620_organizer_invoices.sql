-- Organizer invoices to Tikiti (settlement / fee reconciliation).
-- Tickets may only appear on one non-void invoice.

create sequence if not exists public.organizer_invoice_number_seq start 1;

create or replace function public.next_organizer_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_date text;
begin
  v_seq := nextval('public.organizer_invoice_number_seq');
  v_date := to_char(now() at time zone 'UTC', 'YYYYMMDD');
  return 'TIKIT-INV-' || v_date || '-' || lpad(v_seq::text, 5, '0');
end;
$$;

revoke all on function public.next_organizer_invoice_number() from public;
grant execute on function public.next_organizer_invoice_number() to service_role;

create table if not exists public.organizer_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  organizer_id uuid not null,
  event_id uuid not null references public.events(id) on delete restrict,
  status text not null default 'issued'
    check (status in ('issued', 'paid', 'void')),
  currency text not null default 'ZAR',
  ticket_count integer not null check (ticket_count > 0),
  ticket_revenue numeric(14, 2) not null check (ticket_revenue >= 0),
  service_fee_per_ticket numeric(14, 2) not null check (service_fee_per_ticket >= 0),
  service_fee_total numeric(14, 2) not null check (service_fee_total >= 0),
  net_amount_due numeric(14, 2) not null,
  bill_to jsonb not null default '{}'::jsonb,
  seller jsonb not null default '{}'::jsonb,
  line_items jsonb not null,
  notes text,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizer_invoices_organizer
  on public.organizer_invoices (organizer_id, issued_at desc);

create index if not exists idx_organizer_invoices_event
  on public.organizer_invoices (event_id);

create index if not exists idx_organizer_invoices_status
  on public.organizer_invoices (status);

create table if not exists public.organizer_invoice_tickets (
  invoice_id uuid not null references public.organizer_invoices(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete restrict,
  primary key (ticket_id)
);

create index if not exists idx_organizer_invoice_tickets_invoice
  on public.organizer_invoice_tickets (invoice_id);

-- No direct client access; all reads/writes via service role API routes.
alter table public.organizer_invoices enable row level security;
alter table public.organizer_invoice_tickets enable row level security;

revoke all on table public.organizer_invoices from anon, authenticated;
revoke all on table public.organizer_invoice_tickets from anon, authenticated;

grant all on table public.organizer_invoices to service_role;
grant all on table public.organizer_invoice_tickets to service_role;

comment on table public.organizer_invoices is
  'Immutable settlement invoices from event organizers to Tikiti. Generated server-side from paid tickets.';

comment on table public.organizer_invoice_tickets is
  'Links each paid ticket to at most one invoice (enforced by PK on ticket_id).';
