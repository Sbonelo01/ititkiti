import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { generateOrganizerInvoice, submitOrganizerInvoice } from "./generateOrganizerInvoice";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const ORGANIZER = {
  id: "org-1",
  email: "org@test.com",
  user_metadata: { role: "organizer", name: "Ada" },
} as unknown as User;

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

function thenable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.neq = vi.fn(self);
  chain.in = vi.fn(self);
  chain.order = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.update = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  chain.then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function mockFrom(tableResults: Record<string, { data: unknown; error: unknown }>) {
  const from = vi.fn((table: string) => {
    const result = tableResults[table] ?? {
      data: null,
      error: { message: `unexpected table ${table}` },
    };
    return thenable(result);
  });
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from,
    rpc: vi.fn().mockResolvedValue({ data: "TKT-1", error: null }),
  } as never);
  return from;
}

describe("generateOrganizerInvoice eligibility", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("returns 404 when the event is missing", async () => {
    mockFrom({
      events: { data: null, error: { message: "not found" } },
    });
    const result = await generateOrganizerInvoice(ORGANIZER, EVENT_ID);
    expect(result).toEqual({ ok: false, status: 404, error: "Event not found" });
  });

  it("returns 403 when the organizer does not own the event", async () => {
    mockFrom({
      events: {
        data: {
          id: EVENT_ID,
          title: "Show",
          date: "2020-01-01T00:00:00.000Z",
          location: "Durban",
          price: 50,
          organizer_id: "someone-else",
        },
        error: null,
      },
    });
    const result = await generateOrganizerInvoice(ORGANIZER, EVENT_ID);
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });

  it("blocks generate before the event start", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    mockFrom({
      events: {
        data: {
          id: EVENT_ID,
          title: "Show",
          date: future,
          location: "Durban",
          price: 50,
          organizer_id: ORGANIZER.id,
        },
        error: null,
      },
    });
    const result = await generateOrganizerInvoice(ORGANIZER, EVENT_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/after the event/i);
    }
  });

  it("blocks generate when there are no uninvoiced paid tickets", async () => {
    mockFrom({
      events: {
        data: {
          id: EVENT_ID,
          title: "Show",
          date: "2020-01-01T00:00:00.000Z",
          location: "Durban",
          price: 50,
          organizer_id: ORGANIZER.id,
        },
        error: null,
      },
      organizer_invoices: { data: [], error: null },
      tickets: { data: [], error: null },
    });
    const result = await generateOrganizerInvoice(ORGANIZER, EVENT_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/no uninvoiced paid tickets/i);
    }
  });
});

describe("submitOrganizerInvoice", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("refuses to submit another organizer's invoice", async () => {
    mockFrom({
      organizer_invoices: {
        data: {
          id: "inv-1",
          organizer_id: "other",
          status: "draft",
        },
        error: null,
      },
    });
    const result = await submitOrganizerInvoice(ORGANIZER, "inv-1");
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });

  it("promotes a draft to issued for the owner", async () => {
    const from = mockFrom({
      organizer_invoices: {
        data: {
          id: "inv-1",
          organizer_id: ORGANIZER.id,
          status: "issued",
          invoice_number: "TKT-1",
        },
        error: null,
      },
    });
    // First from() is getInvoiceById (select); second is update.
    from.mockImplementationOnce(() =>
      thenable({
        data: { id: "inv-1", organizer_id: ORGANIZER.id, status: "draft" },
        error: null,
      })
    );
    from.mockImplementationOnce(() =>
      thenable({
        data: { id: "inv-1", organizer_id: ORGANIZER.id, status: "issued" },
        error: null,
      })
    );

    const result = await submitOrganizerInvoice(ORGANIZER, "inv-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.invoice.status).toBe("issued");
  });
});
