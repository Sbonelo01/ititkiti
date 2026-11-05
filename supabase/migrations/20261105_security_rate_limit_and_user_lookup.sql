-- Not applied by the application. Review and apply only with explicit approval.
-- After this migration is applied, set RATE_LIMIT_DURABLE=true so API limits use
-- public.consume_rate_limit. Until that flag is set, the API keeps process-local
-- counters and does not treat them as a shared durable limit.
-- Admin email search calls public.lookup_auth_user_by_email and does not page
-- through auth.admin.listUsers. If this function is missing, that search fails closed.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  expires_at timestamptz not null
);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

drop policy if exists rate_limit_buckets_deny_clients on public.rate_limit_buckets;
create policy rate_limit_buckets_deny_clients
  on public.rate_limit_buckets
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.consume_rate_limit(
  p_key text,
  p_window_ms integer,
  p_max integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window interval;
  v_start timestamptz;
  v_count integer;
begin
  if p_key is null or pg_catalog.length(p_key) < 1 or pg_catalog.length(p_key) > 300 then
    raise exception 'invalid rate limit key';
  end if;
  if p_window_ms is null or p_window_ms < 1000 or p_window_ms > 86400000 then
    raise exception 'invalid rate limit window';
  end if;
  if p_max is null or p_max < 1 or p_max > 100000 then
    raise exception 'invalid rate limit max';
  end if;

  v_window := (p_window_ms::numeric / 1000.0) * interval '1 second';

  insert into public.rate_limit_buckets as b (bucket_key, window_start, request_count, expires_at)
  values (p_key, v_now, 1, v_now + v_window)
  on conflict (bucket_key) do update
    set
      window_start = case
        when b.window_start + v_window <= v_now then v_now
        else b.window_start
      end,
      request_count = case
        when b.window_start + v_window <= v_now then 1
        else b.request_count + 1
      end,
      expires_at = case
        when b.window_start + v_window <= v_now then v_now + v_window
        else b.expires_at
      end
  returning window_start, request_count into v_start, v_count;

  if v_count > p_max then
    update public.rate_limit_buckets
    set request_count = p_max
    where bucket_key = p_key
      and request_count > p_max;

    return pg_catalog.jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', pg_catalog.greatest(
        1,
        pg_catalog.ceil(pg_catalog.extract(epoch from (v_start + v_window - v_now)))::integer
      )
    );
  end if;

  return pg_catalog.jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.lookup_auth_user_by_email(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select pg_catalog.jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'app_metadata', pg_catalog.coalesce(u.raw_app_meta_data, '{}'::jsonb),
    'user_metadata', pg_catalog.coalesce(u.raw_user_meta_data, '{}'::jsonb)
  )
  from auth.users u
  where u.email is not null
    and pg_catalog.lower(u.email) = pg_catalog.lower(pg_catalog.btrim(p_email))
    and pg_catalog.position('@' in pg_catalog.btrim(p_email)) > 1
  limit 1;
$$;

revoke all on function public.lookup_auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.lookup_auth_user_by_email(text) to service_role;

comment on table public.rate_limit_buckets is
  'Shared API rate-limit counters. Service role only. No client policies grant access.';

comment on function public.lookup_auth_user_by_email(text) is
  'Exact auth.users lookup for the super-admin API. Service role only. Does not list users.';
