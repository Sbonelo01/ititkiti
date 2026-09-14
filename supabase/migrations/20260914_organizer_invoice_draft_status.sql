-- Draft invoices let organizers generate from paid tickets, review the document,
-- then submit (status → issued) for Tikiti settlement. Staff paid/void stays
-- issued-only and is unchanged.

do $$
declare
  r record;
begin
  if to_regclass('public.organizer_invoices') is null then
    raise notice 'organizer_invoices does not exist; skip draft status constraint';
    return;
  end if;

  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'organizer_invoices'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.organizer_invoices drop constraint %I', r.conname);
  end loop;
end $$;

do $$
begin
  if to_regclass('public.organizer_invoices') is null then
    return;
  end if;

  alter table public.organizer_invoices
    add constraint organizer_invoices_status_check
    check (status in ('draft', 'issued', 'paid', 'void'));
end $$;
