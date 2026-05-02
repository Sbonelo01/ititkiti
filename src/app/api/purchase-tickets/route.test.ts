import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { finalizePurchaseAtomic } from "@/server/payments/finalizePurchase";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/payments/finalizePurchase", () => ({
  finalizePurchaseAtomic: vi.fn(),
}));

describe("POST /api/purchase-tickets", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetRateLimitBucketsForTests();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_xxx";
    vi.mocked(finalizePurchaseAtomic).mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: true, data: { status: "success" } }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function jsonPost(body: unknown, ip = "198.51.100.1") {
    return new NextRequest("http://localhost/api/purchase-tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 when reference is missing", async () => {
    const res = await POST(
      jsonPost({
        eventId: "ev",
        quantity: 1,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when quantity and ticketSelections are missing", async () => {
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: "ev",
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 when Paystack secret is not configured", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: "ev",
        quantity: 1,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(500);
  });

  it("returns 400 when Paystack verify reports failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: false, data: { status: "failed" } }),
    });
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: "ev",
        quantity: 1,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
    expect(finalizePurchaseAtomic).not.toHaveBeenCalled();
  });

  it("calls finalizePurchaseAtomic after successful verify", async () => {
    vi.mocked(finalizePurchaseAtomic).mockResolvedValue({
      success: true,
      createdTickets: 1,
    });
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: "ev-1",
        quantity: 2,
        user: { email: "a@b.com", name: "Ann" },
      })
    );
    expect(res.status).toBe(200);
    expect(finalizePurchaseAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: "R1",
        eventId: "ev-1",
        quantity: 2,
        ticketUser: { email: "a@b.com", name: "Ann", userId: undefined },
      })
    );
  });

  it("maps only-default ticketSelections to summed quantity", async () => {
    vi.mocked(finalizePurchaseAtomic).mockResolvedValue({ success: true });
    const res = await POST(
      jsonPost({
        reference: "R2",
        eventId: "ev-2",
        ticketSelections: [
          { ticketTypeId: "default", quantity: 2 },
          { ticketTypeId: "default", quantity: 1 },
        ],
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(finalizePurchaseAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 3,
        ticketSelections: undefined,
      })
    );
  });
});
