-- finalize_ticket_purchase is SECURITY DEFINER and mints paid tickets.
-- Restrict EXECUTE to service_role so PostgREST (anon/authenticated) cannot call it.

revoke all on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) from public;
revoke all on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) from anon;
revoke all on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) from authenticated;

grant execute on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) to service_role;
