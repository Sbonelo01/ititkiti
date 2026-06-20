import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { finalizePurchaseAtomic } from "@/server/payments/finalizePurchase";
import { resolveAndVerifyPurchase } from "@/server/payments/verifyPaystackCharge";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/payments/finalizePurchase", () => ({
  finalizePurchaseAtomic: vi.fn(),
}));

vi.mock("@/server/payments/verifyPaystackCharge", () => ({
  resolveAndVerifyPurchase: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("POST /api/purchase-tickets", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(finalizePurchaseAtomic).mockReset();
    vi.mocked(resolveAndVerifyPurchase).mockReset();
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
        eventId: EVENT_ID,
        quantity: 1,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
    expect(resolveAndVerifyPurchase).not.toHaveBeenCalled();
  });

  it("returns 400 when event id is not a uuid", async () => {
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: "not-a-uuid",
        quantity: 1,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when quantity and ticketSelections are missing", async () => {
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: EVENT_ID,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns error when payment verification fails", async () => {
    vi.mocked(resolveAndVerifyPurchase).mockResolvedValue({
      ok: false,
      error: "Payment verification failed",
      status: 400,
    });
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: EVENT_ID,
        quantity: 1,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
    expect(finalizePurchaseAtomic).not.toHaveBeenCalled();
  });

  it("calls finalizePurchaseAtomic after successful verification", async () => {
    vi.mocked(resolveAndVerifyPurchase).mockResolvedValue({
      ok: true,
      charge: {},
      purchase: {
        reference: "R1",
        eventId: EVENT_ID,
        quantity: 2,
        ticketUser: { email: "a@b.com", name: "Ann" },
      },
    });
    vi.mocked(finalizePurchaseAtomic).mockResolvedValue({
      success: true,
      createdTickets: 1,
    });
    const res = await POST(
      jsonPost({
        reference: "R1",
        eventId: EVENT_ID,
        quantity: 2,
        user: { email: "a@b.com", name: "Ann" },
      })
    );
    expect(res.status).toBe(200);
    expect(finalizePurchaseAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: "R1",
        eventId: EVENT_ID,
        quantity: 2,
        ticketUser: { email: "a@b.com", name: "Ann" },
      })
    );
  });

  it("rejects underpaid charges from verifier", async () => {
    vi.mocked(resolveAndVerifyPurchase).mockResolvedValue({
      ok: false,
      error: "Payment amount does not match ticket total",
      status: 400,
    });
    const res = await POST(
      jsonPost({
        reference: "R2",
        eventId: EVENT_ID,
        quantity: 3,
        user: { email: "a@b.com" },
      })
    );
    expect(res.status).toBe(400);
    expect(finalizePurchaseAtomic).not.toHaveBeenCalled();
  });
});
