import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20261105_security_rate_limit_and_user_lookup.sql"
  ),
  "utf8"
);

describe("rate limit and auth lookup migration", () => {
  it("keeps the bucket table service-role only", () => {
    expect(MIGRATION).toContain("alter table public.rate_limit_buckets enable row level security");
    expect(MIGRATION).toContain(
      "revoke all on table public.rate_limit_buckets from public, anon, authenticated"
    );
    expect(MIGRATION).toContain(
      "grant select, insert, update, delete on table public.rate_limit_buckets to service_role"
    );
    expect(MIGRATION).toContain("create policy rate_limit_buckets_deny_clients");
    expect(MIGRATION).toContain("using (false)");
    expect(MIGRATION).not.toContain("grant select on table public.rate_limit_buckets to anon");
    expect(MIGRATION).not.toContain(
      "grant select on table public.rate_limit_buckets to authenticated"
    );
  });

  it("revokes client execute on both functions and grants service_role", () => {
    expect(MIGRATION).toContain(
      "revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated"
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.consume_rate_limit(text, integer, integer) to service_role"
    );
    expect(MIGRATION).toContain(
      "revoke all on function public.lookup_auth_user_by_email(text) from public, anon, authenticated"
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.lookup_auth_user_by_email(text) to service_role"
    );
    expect(MIGRATION).toContain("security definer");
    expect(MIGRATION).toContain("set search_path = pg_catalog");
    expect(MIGRATION).toContain("extract(epoch from");
    expect(MIGRATION).toContain("position('@' in");
    expect(MIGRATION).toContain("coalesce(");
    expect(MIGRATION).toContain("greatest(");
    expect(MIGRATION).not.toContain("pg_catalog.extract(");
    expect(MIGRATION).not.toContain("pg_catalog.position(");
    expect(MIGRATION).not.toContain("pg_catalog.coalesce(");
    expect(MIGRATION).not.toContain("pg_catalog.greatest(");
  });
});
