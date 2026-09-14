import { describe, it, expect, vi, beforeEach } from "vitest";
import { finalizePurchaseAtomic } from "./finalizePurchase";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("finalizePurchaseAtomic", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("calls finalize_ticket_purchase through the service-role admin client", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { success: true, alreadyProcessed: false, createdTickets: 2 },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);

    const result = await finalizePurchaseAtomic({
      reference: "R1",
      eventId: EVENT_ID,
      quantity: 2,
      ticketUser: { email: "a@b.com", name: "Ann" },
    });

    expect(result).toEqual({
      success: true,
      alreadyProcessed: false,
      createdTickets: 2,
    });
    expect(getSupabaseAdmin).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "finalize_ticket_purchase",
      expect.objectContaining({
        p_reference: "R1",
        p_event_id: EVENT_ID,
        p_quantity: 2,
      })
    );
  });
});
