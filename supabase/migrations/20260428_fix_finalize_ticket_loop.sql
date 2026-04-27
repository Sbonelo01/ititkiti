-- Fix nested FOR loop reusing v_idx (can break multi-ticket-type purchases) and use distinct loop variables.

create or replace function public.finalize_ticket_purchase(
  p_reference text,
  p_event_id uuid,
  p_ticket_user jsonb,
  p_ticket_selections jsonb default '[]'::jsonb,
  p_quantity integer default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_total_quantity integer := 0;
  v_ticket_type_id uuid;
  v_selection_quantity integer;
  v_attendee_name text;
  v_email text;
  v_user_id text;
  v_sel integer;
  v_tick integer;
  v_is_new_format boolean := jsonb_typeof(p_ticket_selections) = 'array' and jsonb_array_length(p_ticket_selections) > 0;
begin
  if p_reference is null or p_event_id is null then
    raise exception 'Missing required purchase fields';
  end if;

  v_email := trim(coalesce(p_ticket_user->>'email', ''));
  if v_email = '' then
    raise exception 'Missing purchaser email';
  end if;

  v_attendee_name := coalesce(nullif(trim(coalesce(p_ticket_user->>'name', '')), ''), split_part(v_email, '@', 1), 'Attendee');
  v_user_id := coalesce(nullif(trim(coalesce(p_ticket_user->>'userId', '')), ''), 'anonymous');

  if exists(select 1 from public.tickets where paystack_reference = p_reference) then
    return jsonb_build_object('success', true, 'alreadyProcessed', true, 'createdTickets', 0);
  end if;

  insert into public.payment_receipts(reference, event_id, email, payload)
  values (p_reference, p_event_id, v_email, jsonb_build_object(
    'ticket_user', p_ticket_user,
    'ticket_selections', p_ticket_selections,
    'quantity', p_quantity
  ))
  on conflict (reference) do nothing;

  if not found then
    return jsonb_build_object('success', true, 'alreadyProcessed', true, 'createdTickets', 0);
  end if;

  if v_is_new_format then
    for v_sel in 0..jsonb_array_length(p_ticket_selections) - 1 loop
      v_ticket_type_id := (p_ticket_selections->v_sel->>'ticketTypeId')::uuid;
      v_selection_quantity := coalesce((p_ticket_selections->v_sel->>'quantity')::integer, 0);

      if v_selection_quantity < 1 then
        continue;
      end if;

      update public.ticket_types
      set available_quantity = available_quantity - v_selection_quantity
      where id = v_ticket_type_id
        and event_id = p_event_id
        and available_quantity >= v_selection_quantity;

      if not found then
        raise exception 'Not enough tickets available for ticket type %', v_ticket_type_id;
      end if;

      for v_tick in 1..v_selection_quantity loop
        insert into public.tickets (
          event_id,
          ticket_type_id,
          attendee_name,
          email,
          qr_code_data,
          used,
          payment_status,
          created_at,
          paystack_reference
        )
        values (
          p_event_id,
          v_ticket_type_id,
          v_attendee_name,
          v_email,
          format('TICKET-%s-%s-%s-%s', p_event_id::text, v_user_id, extract(epoch from clock_timestamp())::bigint, gen_random_uuid()::text),
          false,
          'paid',
          now(),
          p_reference
        );
      end loop;

      v_total_quantity := v_total_quantity + v_selection_quantity;
    end loop;
  else
    if p_quantity is null or p_quantity < 1 then
      raise exception 'Missing ticket quantity';
    end if;

    v_total_quantity := p_quantity;

    for v_tick in 1..p_quantity loop
      insert into public.tickets (
        event_id,
        attendee_name,
        email,
        qr_code_data,
        used,
        payment_status,
        created_at,
        paystack_reference
      )
      values (
        p_event_id,
        v_attendee_name,
        v_email,
        format('TICKET-%s-%s-%s-%s', p_event_id::text, v_user_id, extract(epoch from clock_timestamp())::bigint, gen_random_uuid()::text),
        false,
        'paid',
        now(),
        p_reference
      );
    end loop;
  end if;

  update public.events
  set total_tickets = total_tickets - v_total_quantity
  where id = p_event_id
    and total_tickets >= v_total_quantity;

  if not found then
    raise exception 'Not enough tickets available for event %', p_event_id;
  end if;

  return jsonb_build_object('success', true, 'alreadyProcessed', false, 'createdTickets', v_total_quantity);
end;
$$;

grant execute on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) to anon, authenticated, service_role;
