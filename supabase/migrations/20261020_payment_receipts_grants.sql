-- payment_receipts is server-only.
-- Writes happen inside finalize_ticket_purchase (SECURITY DEFINER; EXECUTE
-- is already limited to service_role). Reads happen in /api/payment-lookup
-- through the service-role client. No anon or authenticated code queries it.
-- RLS is already enabled in 20260915_public_rls_policies.sql; enabling it
-- again is a no-op. This revokes the authenticated SELECT from that file
-- so grants match later service-role-only tables. Safe to re-run.

alter table public.payment_receipts enable row level security;

revoke all on table public.payment_receipts from public, anon, authenticated;
grant all on table public.payment_receipts to service_role;
