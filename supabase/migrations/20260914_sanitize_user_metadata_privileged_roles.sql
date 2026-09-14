-- Client-writable user_metadata.role must not carry privileged claims (admin/staff).
-- Staff/admin authorization reads app_metadata.role, which only the Auth Admin API can set.
-- Organizer/attendee remain product roles in user_metadata.

create or replace function public.sanitize_user_metadata_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := lower(btrim(coalesce(NEW.raw_user_meta_data->>'role', '')));

  if requested_role <> '' and requested_role not in ('organizer', 'attendee') then
    NEW.raw_user_meta_data := jsonb_set(
      coalesce(NEW.raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"attendee"'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists sanitize_user_metadata_role on auth.users;
create trigger sanitize_user_metadata_role
  before insert or update on auth.users
  for each row
  execute procedure public.sanitize_user_metadata_role();

-- Strip existing privileged claims from user_metadata. Do not copy them to app_metadata
-- (that would promote anyone who already self-assigned admin/staff).
update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"attendee"'
)
where lower(btrim(coalesce(raw_user_meta_data->>'role', ''))) not in ('organizer', 'attendee', '');

revoke all on function public.sanitize_user_metadata_role() from public, anon, authenticated;
