import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
const fileName = readdirSync(migrationsDir).find((name) =>
  name.endsWith("_organizer_public_profiles.sql")
);
const MIGRATION = fileName
  ? readFileSync(path.join(migrationsDir, fileName), "utf8")
  : "";

const SQL = MIGRATION.split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

describe("organizer public profile migration", () => {
  it("is a dated review-only migration", () => {
    expect(fileName).toMatch(/^\d{8,14}_organizer_public_profiles\.sql$/);
    expect(MIGRATION).toContain("Not applied");
    expect(MIGRATION).toContain("no backfill");
  });

  it("stores only opt-in public columns", () => {
    expect(SQL).toContain("display_name");
    expect(SQL).toContain("bio");
    expect(SQL).toContain("website_url");
    expect(SQL).toContain("logo_url");
    expect(SQL).toContain("public_email");
    expect(SQL).toContain("public_phone");
    expect(SQL).not.toContain("cellphone");
    expect(SQL).not.toContain("user_metadata");
    expect(SQL).not.toContain("raw_user_meta_data");
    expect(SQL).not.toContain("bank");
    expect(SQL).not.toMatch(/\bemail\b/);
    expect(SQL).not.toMatch(/\bphone\b/);
  });

  it("enables RLS and revokes public, anon, authenticated, and service_role before least-privilege grants", () => {
    expect(MIGRATION).toContain(
      "alter table public.organizer_public_profiles enable row level security"
    );
    expect(MIGRATION).toContain(
      "revoke all on table public.organizer_public_profiles from public"
    );
    expect(MIGRATION).toContain(
      "revoke all on table public.organizer_public_profiles from anon"
    );
    expect(MIGRATION).toContain(
      "revoke all on table public.organizer_public_profiles from authenticated"
    );
    expect(MIGRATION).toContain(
      "revoke all on table public.organizer_public_profiles from service_role"
    );
    expect(MIGRATION).toContain(
      "grant select, insert, update, delete on table public.organizer_public_profiles to authenticated"
    );
    expect(MIGRATION).toContain(
      "grant select, insert, update, delete on table public.organizer_public_profiles to service_role"
    );
    expect(MIGRATION.toLowerCase()).not.toContain("grant all");
    expect(SQL).not.toMatch(/grant\b[^;]*\bto anon\b/i);
    expect(SQL).not.toContain("grant select on table public.organizer_public_profiles to anon");
  });

  it("lets an organiser manage only their own row and denies anonymous reads", () => {
    expect(MIGRATION).toContain("create policy organizer_public_profiles_deny_anon");
    expect(MIGRATION).toContain("to anon");
    expect(MIGRATION).toContain("using (false)");
    expect(MIGRATION).toContain("organizer_id = (select auth.uid())");
    expect(MIGRATION).toContain("for select");
    expect(MIGRATION).toContain("for insert");
    expect(MIGRATION).toContain("for update");
    expect(MIGRATION).toContain("for delete");
    expect(MIGRATION).not.toContain("using (true)");
  });

  it("does not widen grants on auth users, legacy profiles, events, or payment tables", () => {
    expect(SQL).not.toMatch(/grant\s+[^;]*\son\s+(table\s+)?auth\.users/i);
    expect(SQL).not.toMatch(/grant\s+[^;]*\son\s+(table\s+)?public\.users/i);
    expect(SQL).not.toContain("public.events");
    expect(SQL).not.toContain("public.tickets");
    expect(SQL).not.toContain("payment_receipts");
    expect(SQL).not.toContain("insert into");
    expect(SQL).not.toContain("security definer");
  });
});
