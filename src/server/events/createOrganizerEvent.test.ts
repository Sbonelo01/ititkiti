import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { createOrganizerEvent } from "./createOrganizerEvent";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { deliverOrganizerWelcomeEmail } from "@/server/email/organizerWelcomeEmailDelivery";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/server/email/organizerWelcomeEmailDelivery", () => ({
  deliverOrganizerWelcomeEmail: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const organizer = {
  id: "org-1",
  email: "org@test.com",
  user_metadata: { name: "Ada" },
} as unknown as User;

const input = {
  title: "Jazz Night",
  description: "Live set",
  date: "2026-10-01T18:00:00.000Z",
  location: "Cape Town",
  posterUrl: "https://example.com/poster.jpg",
  ticketTypes: [
    { name: "General", price: 100, quantity: 40, description: null },
    { name: "VIP", price: 250, quantity: 10, description: "Front row" },
  ],
};

function installSupabase(options: {
  eventError?: { message: string } | null;
  ticketError?: { message: string } | null;
}) {
  const inserts: { table: string; payload: unknown }[] = [];
  const deletes: string[] = [];
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.insert = vi.fn((payload: unknown) => {
      inserts.push({ table, payload });
      return chain;
    });
    chain.delete = vi.fn(() => {
      deletes.push(table);
      return chain;
    });
    chain.single = vi.fn(async () => {
      if (options.eventError) return { data: null, error: options.eventError };
      return { data: { id: EVENT_ID, title: "Jazz Night" }, error: null };
    });
    chain.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown
    ) => {
      if (table === "ticket_types") {
        return Promise.resolve({ data: null, error: options.ticketError ?? null }).then(
          resolve,
          reject
        );
      }
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    };
    return chain;
  });
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
  return { inserts, deletes };
}

describe("createOrganizerEvent", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
    vi.mocked(deliverOrganizerWelcomeEmail).mockReset();
    vi.mocked(deliverOrganizerWelcomeEmail).mockResolvedValue({
      outcome: "sent",
      id: "email_1",
    });
  });

  it("inserts the event for the authenticated organizer and sends the welcome email", async () => {
    const { inserts } = installSupabase({});
    const result = await createOrganizerEvent(organizer, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event).toEqual({ id: EVENT_ID, title: "Jazz Night" });
    expect(result.welcomeEmail).toEqual({ sent: true });

    const eventInsert = inserts.find((call) => call.table === "events");
    expect(eventInsert?.payload).toMatchObject({
      title: "Jazz Night",
      organizer_id: "org-1",
      price: 100,
      total_tickets: 50,
      poster_url: input.posterUrl,
    });

    const ticketInsert = inserts.find((call) => call.table === "ticket_types");
    expect(ticketInsert?.payload).toEqual([
      {
        event_id: EVENT_ID,
        name: "General",
        price: 100,
        quantity: 40,
        available_quantity: 40,
        description: null,
      },
      {
        event_id: EVENT_ID,
        name: "VIP",
        price: 250,
        quantity: 10,
        available_quantity: 10,
        description: "Front row",
      },
    ]);

    expect(deliverOrganizerWelcomeEmail).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      user: organizer,
    });
  });

  it("rolls back the event and does not email when ticket types fail", async () => {
    const { deletes } = installSupabase({ ticketError: { message: "boom" } });
    const result = await createOrganizerEvent(organizer, input);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Failed to create ticket types",
    });
    expect(deletes).toEqual(["events"]);
    expect(deliverOrganizerWelcomeEmail).not.toHaveBeenCalled();
  });

  it("still returns the event when the welcome email fails", async () => {
    installSupabase({});
    vi.mocked(deliverOrganizerWelcomeEmail).mockResolvedValue({
      outcome: "skipped",
      reason: "not_configured",
    });
    const result = await createOrganizerEvent(organizer, input);
    expect(result).toEqual({
      ok: true,
      event: { id: EVENT_ID, title: "Jazz Night" },
      welcomeEmail: { sent: false, reason: "not_configured" },
    });
  });
});
