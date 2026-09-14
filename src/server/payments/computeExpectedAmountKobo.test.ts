import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { computeExpectedAmountKobo } from "@/server/payments/computeExpectedAmountKobo";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function mockCatalog(event: { id: string; price: number } | null, types: { id: string; price: number }[] = []) {
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from(table: string) {
      if (table === "events") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: event,
                error: event ? null : { message: "not found" },
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            in: async () => ({ data: types, error: null }),
          }),
        }),
      };
    },
  } as never);
}

describe("computeExpectedAmountKobo", () => {
  const eventId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("uses R10 fee for a R100 ticket type", async () => {
    mockCatalog({ id: eventId, price: 0 }, [{ id: "tt-mid", price: 100 }]);
    const result = await computeExpectedAmountKobo(eventId, [{ ticketTypeId: "tt-mid", quantity: 1 }]);
    expect(result).toEqual({ amountKobo: 11000, currency: "ZAR" });
  });

  it("uses R5 fee below R50 and 5% above R200", async () => {
    mockCatalog({ id: eventId, price: 0 }, [
      { id: "tt-low", price: 40 },
      { id: "tt-high", price: 250 },
    ]);
    const result = await computeExpectedAmountKobo(eventId, [
      { ticketTypeId: "tt-low", quantity: 2 },
      { ticketTypeId: "tt-high", quantity: 1 },
    ]);
    // 40+5 + 40+5 + 250+12.50 = 352.50
    expect(result).toEqual({ amountKobo: 35250, currency: "ZAR" });
  });

  it("uses event price and buyer fee on the quantity path", async () => {
    mockCatalog({ id: eventId, price: 30 });
    const result = await computeExpectedAmountKobo(eventId, undefined, 2);
    // (30+5) * 2 = 70
    expect(result).toEqual({ amountKobo: 7000, currency: "ZAR" });
  });

  it("returns 404 when the event is missing", async () => {
    mockCatalog(null);
    const result = await computeExpectedAmountKobo(eventId, undefined, 1);
    expect(result).toEqual({ error: "Event not found", status: 404 });
  });
});
