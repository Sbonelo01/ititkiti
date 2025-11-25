-- Supabase RPC: validate_and_mark
-- This function atomically checks whether a ticket with the provided QR code
-- exists and is unused, marks it as used, and returns a JSON result.
-- Adjust table/column names if your schema differs.

create or replace function public.validate_and_mark(qr text)
returns jsonb
language plpgsql
security definer
as $$
declare
  t record;
  result jsonb;
begin
  -- Lock the matching row for update to avoid race conditions
  select * into t
  from public.tickets
  where qr_code_data = qr
  for update;

  if not found then
    result := jsonb_build_object('status','not_found');
    return result;
  end if;

  if coalesce(t.used, false) then
    result := jsonb_build_object('status','already_used','ticket', row_to_json(t));
    return result;
  end if;

  -- If you have a `used_at` column you can update it too. Many schemas don't include it,
  -- so we only update the `used` flag here to avoid errors.
  update public.tickets set used = true where id = t.id;

  select * into t from public.tickets where id = t.id;

  result := jsonb_build_object('status','valid','ticket', row_to_json(t));
  return result;
end;
$$;
