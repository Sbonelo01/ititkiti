-- Row-level security for every public table, plus least-privilege grants.
-- Verified against client (anon key) and server (service_role) call sites:
--   events / ticket_types: public catalog + organizer CRUD
--   tickets: attendee email (JWT) + organizer event + staff app_metadata SELECT
--   payment_receipts / invoices: organizer/staff SELECT; writes stay service_role
--   subscribers / public.users writes: no client policies (deny-all)
--
-- This file does not apply itself to production. Apply via SQL editor or
-- `supabase db push` after review. See supabase/RLS.md.

-- ---------------------------------------------------------------------------
-- Helpers live in `private` so PostgREST (exposed schemas: public) cannot
-- call them as RPCs. SECURITY INVOKER: they use the caller's JWT / uid.
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_staff_or_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '')
    in ('staff', 'admin');
$$;

comment on function private.is_staff_or_admin() is
  'True when JWT app_metadata.role is staff or admin. Never read user_metadata.';

create or replace function private.is_event_organizer(p_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.organizer_id = (select auth.uid())
  );
$$;

comment on function private.is_event_organizer(uuid) is
  'True when auth.uid() owns events.id = p_event_id.';

revoke all on function private.is_staff_or_admin() from public, anon;
revoke all on function private.is_event_organizer(uuid) from public, anon;
grant execute on function private.is_staff_or_admin() to authenticated, service_role;
grant execute on function private.is_event_organizer(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ensure RLS is on (idempotent). No FORCE RLS: table owner / service_role
-- must still bypass for webhooks, finalize_ticket_purchase, invoice APIs.
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_types enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.organizer_invoices enable row level security;
alter table public.organizer_invoice_tickets enable row level security;
alter table public.subscribers enable row level security;
alter table public.users enable row level security;

-- ---------------------------------------------------------------------------
-- Drop overly permissive / unused policies
-- ---------------------------------------------------------------------------

drop policy if exists "Allow ticket purchase updates" on public.events;
drop policy if exists "Enable insert for authenticated users only" on public.events;
drop policy if exists "Enable read access for all users" on public.events;
drop policy if exists "Organizers can delete their own events" on public.events;
drop policy if exists "Organizers can update their own events" on public.events;

drop policy if exists "Public can view all tickets" on public.tickets;
drop policy if exists "Public can view ticket counts" on public.tickets;
drop policy if exists "Users can create tickets" on public.tickets;
drop policy if exists "Users can update their own tickets" on public.tickets;
drop policy if exists "Users can view their own tickets" on public.tickets;

drop policy if exists "select_own_users" on public.users;

drop policy if exists events_select_catalog on public.events;
drop policy if exists events_insert_own on public.events;
drop policy if exists events_update_own on public.events;
drop policy if exists events_delete_own on public.events;

drop policy if exists ticket_types_select_catalog on public.ticket_types;
drop policy if exists ticket_types_insert_own_event on public.ticket_types;
drop policy if exists ticket_types_update_own_event on public.ticket_types;
drop policy if exists ticket_types_delete_own_event on public.ticket_types;

drop policy if exists tickets_select_attendee on public.tickets;
drop policy if exists tickets_select_organizer on public.tickets;
drop policy if exists tickets_select_staff on public.tickets;

drop policy if exists payment_receipts_select_organizer on public.payment_receipts;
drop policy if exists payment_receipts_select_staff on public.payment_receipts;

drop policy if exists organizer_invoices_select_own on public.organizer_invoices;
drop policy if exists organizer_invoices_select_staff on public.organizer_invoices;

drop policy if exists organizer_invoice_tickets_select_own on public.organizer_invoice_tickets;
drop policy if exists organizer_invoice_tickets_select_staff on public.organizer_invoice_tickets;

drop policy if exists subscribers_no_client_access on public.subscribers;
drop policy if exists users_select_own on public.users;

-- ---------------------------------------------------------------------------
-- events
-- No published flag exists; the catalog is every row (home/events pages).
-- INSERT/UPDATE/DELETE restricted to organizer_id = auth.uid().
-- Staff dashboard SELECTs catalog fields; public SELECT covers that.
-- Ticket inventory mutations run in finalize_ticket_purchase (service_role).
-- ---------------------------------------------------------------------------

create policy events_select_catalog
  on public.events
  for select
  to anon, authenticated
  using (true);

create policy events_insert_own
  on public.events
  for insert
  to authenticated
  with check (organizer_id = (select auth.uid()));

create policy events_update_own
  on public.events
  for update
  to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy events_delete_own
  on public.events
  for delete
  to authenticated
  using (organizer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ticket_types
-- Public event pages select types by event_id (anon). Organizers insert types
-- on create-event. Inventory decrements are service_role only.
-- ---------------------------------------------------------------------------

create policy ticket_types_select_catalog
  on public.ticket_types
  for select
  to anon, authenticated
  using (true);

create policy ticket_types_insert_own_event
  on public.ticket_types
  for insert
  to authenticated
  with check ((select private.is_event_organizer(event_id)));

create policy ticket_types_update_own_event
  on public.ticket_types
  for update
  to authenticated
  using ((select private.is_event_organizer(event_id)))
  with check ((select private.is_event_organizer(event_id)));

create policy ticket_types_delete_own_event
  on public.ticket_types
  for delete
  to authenticated
  using ((select private.is_event_organizer(event_id)));

-- ---------------------------------------------------------------------------
-- tickets
-- No client INSERT/UPDATE/DELETE. Minting is finalize_ticket_purchase;
-- used-flag updates are /api/validate-ticket (service_role).
-- Attendee dashboard + navbar count filter by email = auth email.
-- Organizer dashboard filters by event_id of owned events.
-- Staff admin page lists all paid tickets; JWT app_metadata.role only.
-- ---------------------------------------------------------------------------

create policy tickets_select_attendee
  on public.tickets
  for select
  to authenticated
  using (
    (select auth.jwt() ->> 'email') is not null
    and lower(email) = lower((select auth.jwt() ->> 'email'))
  );

create policy tickets_select_organizer
  on public.tickets
  for select
  to authenticated
  using ((select private.is_event_organizer(event_id)));

create policy tickets_select_staff
  on public.tickets
  for select
  to authenticated
  using ((select private.is_staff_or_admin()));

-- ---------------------------------------------------------------------------
-- payment_receipts
-- Client SELECT for organizers (own events) and staff. Payload is PII;
-- no attendee/anon access. Writes: webhook / finalize RPC (service_role).
-- /api/payment-lookup already uses the admin client.
-- ---------------------------------------------------------------------------

create policy payment_receipts_select_organizer
  on public.payment_receipts
  for select
  to authenticated
  using ((select private.is_event_organizer(event_id)));

create policy payment_receipts_select_staff
  on public.payment_receipts
  for select
  to authenticated
  using ((select private.is_staff_or_admin()));

-- ---------------------------------------------------------------------------
-- organizer_invoices + organizer_invoice_tickets
-- Dashboard invoices go through /api/invoices (service_role). SELECT policies
-- match the desired model so a future client read of own invoices is safe.
-- No INSERT/UPDATE/DELETE policies — minting/status stay server-side.
-- ---------------------------------------------------------------------------

create policy organizer_invoices_select_own
  on public.organizer_invoices
  for select
  to authenticated
  using (organizer_id = (select auth.uid()));

create policy organizer_invoices_select_staff
  on public.organizer_invoices
  for select
  to authenticated
  using ((select private.is_staff_or_admin()));

create policy organizer_invoice_tickets_select_own
  on public.organizer_invoice_tickets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organizer_invoices i
      where i.id = organizer_invoice_tickets.invoice_id
        and i.organizer_id = (select auth.uid())
    )
  );

create policy organizer_invoice_tickets_select_staff
  on public.organizer_invoice_tickets
  for select
  to authenticated
  using ((select private.is_staff_or_admin()));

-- ---------------------------------------------------------------------------
-- subscribers: no newsletter UI. Explicit deny-all so the advisor does not
-- report "RLS enabled, no policy", and TRUNCATE is already revoked.
-- ---------------------------------------------------------------------------

create policy subscribers_no_client_access
  on public.subscribers
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.subscribers is
  'Newsletter emails. RLS deny-all for anon/authenticated (using false). Service role only.';

-- ---------------------------------------------------------------------------
-- public.users (legacy profile; app uses auth.users via supabase.auth)
-- ---------------------------------------------------------------------------

create policy users_select_own
  on public.users
  for select
  to authenticated
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Table privileges: TRUNCATE bypasses RLS, so revoke ALL then grant the
-- commands policies actually allow.
-- ---------------------------------------------------------------------------

revoke all on table public.events from public, anon, authenticated;
grant select on table public.events to anon, authenticated;
grant insert, update, delete on table public.events to authenticated;

revoke all on table public.ticket_types from public, anon, authenticated;
grant select on table public.ticket_types to anon, authenticated;
grant insert, update, delete on table public.ticket_types to authenticated;

revoke all on table public.tickets from public, anon, authenticated;
grant select on table public.tickets to authenticated;

revoke all on table public.payment_receipts from public, anon, authenticated;
grant select on table public.payment_receipts to authenticated;

revoke all on table public.organizer_invoices from public, anon, authenticated;
grant select on table public.organizer_invoices to authenticated;

revoke all on table public.organizer_invoice_tickets from public, anon, authenticated;
grant select on table public.organizer_invoice_tickets to authenticated;

revoke all on table public.subscribers from public, anon, authenticated;

revoke all on table public.users from public, anon, authenticated;
grant select on table public.users to authenticated;

-- service_role keeps full access (Supabase default GRANT ALL). Re-assert it
-- in case a prior revoke from PUBLIC affected it on some objects.
grant all on table public.events to service_role;
grant all on table public.ticket_types to service_role;
grant all on table public.tickets to service_role;
grant all on table public.payment_receipts to service_role;
grant all on table public.organizer_invoices to service_role;
grant all on table public.organizer_invoice_tickets to service_role;
grant all on table public.subscribers to service_role;
grant all on table public.users to service_role;

-- ---------------------------------------------------------------------------
-- Sequences: clients must not bump invoice numbers or subscriber ids.
-- ---------------------------------------------------------------------------

revoke all on sequence public.organizer_invoice_number_seq from public, anon, authenticated;
grant usage, select, update on sequence public.organizer_invoice_number_seq to service_role;

revoke all on sequence public.subscribers_id_seq from public, anon, authenticated;
grant usage, select, update on sequence public.subscribers_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- RPCs: next_organizer_invoice_number is SECURITY DEFINER (allocates seq).
-- Only called from generateOrganizerInvoice via getSupabaseAdmin().
-- decrement_tickets is unused in app code and was executable by anon.
-- ---------------------------------------------------------------------------

revoke all on function public.next_organizer_invoice_number() from public, anon, authenticated;
grant execute on function public.next_organizer_invoice_number() to service_role;

revoke all on function public.decrement_tickets() from public, anon, authenticated;
revoke all on function public.decrement_tickets(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_tickets() to service_role;
grant execute on function public.decrement_tickets(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Indexes used by organizer RLS lookups
-- ---------------------------------------------------------------------------

create index if not exists idx_payment_receipts_event_id
  on public.payment_receipts (event_id);
