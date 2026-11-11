-- Not applied by the application. Review and apply only with explicit approval.
-- Applying this file does not copy Auth email, phone, logo, or user_metadata
-- onto the public event page. There is no backfill.
--
-- public.events has no organiser name, bio, website, or contact columns.
-- Signup name, surname, company_name, cellphone, and company_logo live in
-- auth user_metadata. Account email lives on auth.users. public.users is a
-- legacy own-row profile and is not a public organiser card.
--
-- This table is the only place an organiser can later store fields they intend
-- to publish (display name, bio, website, logo, public email, public phone).
-- The event page reads it with the service role and returns those columns
-- only. Anonymous clients cannot select it, so auth user ids are not listable
-- through the Data API.

create table if not exists public.organizer_public_profiles (
  organizer_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  bio text,
  website_url text,
  logo_url text,
  public_email text,
  public_phone text,
  updated_at timestamptz not null default now(),
  constraint organizer_public_profiles_display_name_len check (
    char_length(btrim(display_name)) between 1 and 200
  ),
  constraint organizer_public_profiles_bio_len check (
    bio is null or char_length(bio) <= 2000
  ),
  constraint organizer_public_profiles_website_url_http check (
    website_url is null
    or (
      char_length(website_url) <= 2000
      and website_url ~ '^https?://[^[:space:]]+$'
      and website_url !~ '://[^/[:space:]]*@'
    )
  ),
  constraint organizer_public_profiles_logo_url_http check (
    logo_url is null
    or (
      char_length(logo_url) <= 2000
      and logo_url ~ '^https?://[^[:space:]]+$'
      and logo_url !~ '://[^/[:space:]]*@'
    )
  ),
  constraint organizer_public_profiles_public_email_shape check (
    public_email is null
    or (
      char_length(public_email) <= 200
      and public_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  constraint organizer_public_profiles_public_phone_shape check (
    public_phone is null
    or (
      char_length(public_phone) <= 40
      and public_phone ~ '^\+?[0-9][0-9 ().-]{6,}$'
    )
  )
);

comment on table public.organizer_public_profiles is
  'Opt-in public organiser card. Rows are saved by the organiser. There is no backfill from auth.';

comment on column public.organizer_public_profiles.public_email is
  'Address the organiser saved for the public event page. Distinct from the account address.';

comment on column public.organizer_public_profiles.public_phone is
  'Number the organiser saved for the public event page. Distinct from the account number.';

alter table public.organizer_public_profiles enable row level security;

revoke all on table public.organizer_public_profiles from public;
revoke all on table public.organizer_public_profiles from anon;
revoke all on table public.organizer_public_profiles from authenticated;
revoke all on table public.organizer_public_profiles from service_role;

grant select, insert, update, delete on table public.organizer_public_profiles to authenticated;
grant select, insert, update, delete on table public.organizer_public_profiles to service_role;

drop policy if exists organizer_public_profiles_deny_anon on public.organizer_public_profiles;
create policy organizer_public_profiles_deny_anon
  on public.organizer_public_profiles
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists organizer_public_profiles_select_own on public.organizer_public_profiles;
create policy organizer_public_profiles_select_own
  on public.organizer_public_profiles
  for select
  to authenticated
  using (organizer_id = (select auth.uid()));

drop policy if exists organizer_public_profiles_insert_own on public.organizer_public_profiles;
create policy organizer_public_profiles_insert_own
  on public.organizer_public_profiles
  for insert
  to authenticated
  with check (organizer_id = (select auth.uid()));

drop policy if exists organizer_public_profiles_update_own on public.organizer_public_profiles;
create policy organizer_public_profiles_update_own
  on public.organizer_public_profiles
  for update
  to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

drop policy if exists organizer_public_profiles_delete_own on public.organizer_public_profiles;
create policy organizer_public_profiles_delete_own
  on public.organizer_public_profiles
  for delete
  to authenticated
  using (organizer_id = (select auth.uid()));
