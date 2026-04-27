-- The app and finalize_ticket_purchase() require this column; add if the table predates it.

alter table public.tickets
  add column if not exists paystack_reference text;

comment on column public.tickets.paystack_reference is 'Paystack transaction reference (shared across multiple rows for one purchase).';

create index if not exists idx_tickets_paystack_reference
  on public.tickets (paystack_reference)
  where paystack_reference is not null;
