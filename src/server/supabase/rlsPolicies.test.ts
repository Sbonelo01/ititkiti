import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260915_public_rls_policies.sql"),
  "utf8"
);

describe("public RLS migration", () => {
  it("enables RLS on every public table the app uses", () => {
    const tables = [
      "events",
      "tickets",
      "ticket_types",
      "payment_receipts",
      "organizer_invoices",
      "organizer_invoice_tickets",
      "subscribers",
      "users",
    ];
    for (const table of tables) {
      expect(MIGRATION).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("replaces the world-readable and client-writable ticket policies", () => {
    expect(MIGRATION).toContain('drop policy if exists "Public can view all tickets" on public.tickets');
    expect(MIGRATION).toContain('drop policy if exists "Users can create tickets" on public.tickets');
    expect(MIGRATION).toContain('drop policy if exists "Users can update their own tickets" on public.tickets');
    expect(MIGRATION).toContain("create policy tickets_select_attendee");
    expect(MIGRATION).toContain("create policy tickets_select_organizer");
    expect(MIGRATION).toContain("create policy tickets_select_staff");
    expect(MIGRATION).not.toContain("on public.tickets\n  for insert");
    expect(MIGRATION).not.toContain("on public.tickets\n  for update");
    expect(MIGRATION).not.toContain("on public.tickets\n  for delete");
  });

  it("keeps the public event catalog readable and scopes organizer writes", () => {
    expect(MIGRATION).toContain("create policy events_select_catalog");
    expect(MIGRATION).toContain("to anon, authenticated");
    expect(MIGRATION).toContain("create policy events_insert_own");
    expect(MIGRATION).toContain("organizer_id = (select auth.uid())");
    expect(MIGRATION).toContain('drop policy if exists "Allow ticket purchase updates" on public.events');
  });

  it("adds ticket_types and billing SELECT policies and a subscribers deny-all", () => {
    expect(MIGRATION).toContain("create policy ticket_types_select_catalog");
    expect(MIGRATION).toContain("create policy payment_receipts_select_organizer");
    expect(MIGRATION).toContain("create policy organizer_invoices_select_own");
    expect(MIGRATION).toContain("create policy organizer_invoice_tickets_select_own");
    expect(MIGRATION).toContain("create policy subscribers_no_client_access");
    expect(MIGRATION).toContain("using (false)");
  });

  it("reads staff from app_metadata only and revokes invoice RPC from clients", () => {
    expect(MIGRATION).toContain("auth.jwt() -> 'app_metadata' ->> 'role'");
    expect(MIGRATION).not.toMatch(/auth\.jwt\(\) -> ['\"]user_metadata['\"]/);
    expect(MIGRATION).not.toContain("raw_user_meta_data");
    expect(MIGRATION).toContain(
      "revoke all on function public.next_organizer_invoice_number() from public, anon, authenticated"
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.next_organizer_invoice_number() to service_role"
    );
  });

  it("revokes TRUNCATE-capable ALL grants from client roles on sensitive tables", () => {
    expect(MIGRATION).toContain("revoke all on table public.tickets from public, anon, authenticated");
    expect(MIGRATION).toContain("revoke all on table public.payment_receipts from public, anon, authenticated");
    expect(MIGRATION).toContain("revoke all on table public.subscribers from public, anon, authenticated");
    expect(MIGRATION).toContain("grant select on table public.tickets to authenticated");
    expect(MIGRATION).not.toContain("grant insert on table public.tickets");
  });
});
