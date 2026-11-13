import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20261113154720_event_scanner_member_invites.sql"
  ),
  "utf8"
);

describe("event scanner member invite migration", () => {
  it("adds invite columns and a generated status without core-table foreign keys", () => {
    expect(MIGRATION).toContain("add column if not exists invited_email");
    expect(MIGRATION).toContain("add column if not exists invited_by");
    expect(MIGRATION).toContain("add column if not exists revoked_at");
    expect(MIGRATION).toContain("generated always as");
    expect(MIGRATION).toContain("'pending'");
    expect(MIGRATION).toContain("'active'");
    expect(MIGRATION).toContain("'removed'");
    expect(MIGRATION).toContain("uq_event_scanner_members_event_email_active");
    expect(MIGRATION).not.toContain("references public.events");
    expect(MIGRATION).not.toContain("references auth.users");
    expect(MIGRATION).not.toContain("create policy");
  });

  it("enables RLS and grants the table only to service_role", () => {
    expect(MIGRATION).toContain(
      "alter table public.event_scanner_members enable row level security"
    );
    expect(MIGRATION).toContain(
      "revoke all on table public.event_scanner_members from public"
    );
    expect(MIGRATION).toContain(
      "revoke all on table public.event_scanner_members from anon"
    );
    expect(MIGRATION).toContain(
      "revoke all on table public.event_scanner_members from authenticated"
    );
    expect(MIGRATION).toContain(
      "grant all on table public.event_scanner_members to service_role"
    );
    expect(MIGRATION).not.toContain("to anon");
    expect(MIGRATION).not.toContain("to authenticated");
  });
});
