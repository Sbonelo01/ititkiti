import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20261106_payment_binding_and_public_revokes.sql"
  ),
  "utf8"
);

describe("payment binding and public revoke migration", () => {
  it("stores the payment reference and keeps finalize service-role only", () => {
    expect(MIGRATION).toContain("paystack_reference");
    expect(MIGRATION).toContain("p_reference,");
    expect(MIGRATION).toContain(
      "revoke all on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) from public, anon, authenticated"
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.finalize_ticket_purchase(text, uuid, jsonb, jsonb, integer) to service_role"
    );
    expect(MIGRATION).not.toContain("to anon, authenticated, service_role");
  });

  it("does not replace decrement_tickets and re-asserts public revoke", () => {
    expect(MIGRATION).not.toContain("create or replace function public.decrement_tickets");
    expect(MIGRATION).toContain(
      "revoke all on function public.decrement_tickets() from public, anon, authenticated"
    );
    expect(MIGRATION).toContain(
      "revoke all on function public.decrement_tickets(uuid, integer) from public, anon, authenticated"
    );
    expect(MIGRATION).toContain("grant execute on function public.decrement_tickets() to service_role");
  });

  it("revokes public on event_scanner_members without granting clients", () => {
    expect(MIGRATION).toContain(
      "revoke all on table public.event_scanner_members from public"
    );
    expect(MIGRATION).toContain(
      "grant all on table public.event_scanner_members to service_role"
    );
    expect(MIGRATION).not.toContain(
      "grant select on table public.event_scanner_members to anon"
    );
    expect(MIGRATION).not.toContain(
      "grant select on table public.event_scanner_members to authenticated"
    );
  });
});
