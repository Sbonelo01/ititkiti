-- Revoke public execute on finalize_ticket_purchase (server-only via service_role).
revoke execute on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) from anon, authenticated;

-- Harden validate_and_mark if present: require paid tickets and limit returned columns.
create or replace function public.validate_and_mark(qr text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  select id, attendee_name, email, used, event_id, created_at, payment_status
  into t
  from public.tickets
  where qr_code_data = qr
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if coalesce(t.payment_status, '') <> 'paid' then
    return jsonb_build_object('status', 'not_found');
  end if;

  if coalesce(t.used, false) then
    return jsonb_build_object(
      'status', 'already_used',
      'ticket', jsonb_build_object(
        'attendee_name', t.attendee_name,
        'email', t.email,
        'event_id', t.event_id,
        'created_at', t.created_at
      )
    );
  end if;

  update public.tickets set used = true where id = t.id;

  return jsonb_build_object(
    'status', 'valid',
    'ticket', jsonb_build_object(
      'attendee_name', t.attendee_name,
      'email', t.email,
      'event_id', t.event_id,
      'created_at', t.created_at
    )
  );
end;
$$;

revoke execute on function public.validate_and_mark(text) from anon, authenticated, public;
