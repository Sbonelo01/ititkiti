import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  assertPaystackAmountMatches,
  resolveAndVerifyPurchase,
} from "@/server/payments/verifyPaystackCharge";
import { computeExpectedAmountKobo } from "@/server/payments/computeExpectedAmountKobo";

vi.mock("@/server/payments/computeExpectedAmountKobo", () => ({
  computeExpectedAmountKobo: vi.fn(),
}));

describe("assertPaystackAmountMatches", () => {
  it("accepts exact ZAR kobo match", () => {
    expect(assertPaystackAmountMatches({ amount: 11000, currency: "ZAR" }, { amountKobo: 11000, currency: "ZAR" })).toEqual({
      ok: true,
    });
  });

  it("rejects underpay, overpay, and currency mismatch", () => {
    expect(assertPaystackAmountMatches({ amount: 10999, currency: "ZAR" }, { amountKobo: 11000, currency: "ZAR" }).ok).toBe(false);
    expect(assertPaystackAmountMatches({ amount: 11001, currency: "ZAR" }, { amountKobo: 11000, currency: "ZAR" }).ok).toBe(false);
    expect(assertPaystackAmountMatches({ amount: 11000, currency: "NGN" }, { amountKobo: 11000, currency: "ZAR" })).toEqual({
      ok: false,
      error: "Payment currency mismatch",
    });
  });
});

describe("resolveAndVerifyPurchase", () => {
  const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.mocked(computeExpectedAmountKobo).mockReset();
    vi.mocked(computeExpectedAmountKobo).mockResolvedValue({ amountKobo: 11000, currency: "ZAR" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          status: true,
          data: {
            status: "success",
            reference: "R1",
            amount: 11000,
            currency: "ZAR",
            customer: { email: "buyer@example.com", name: "Buyer" },
            metadata: {
              event_id: EVENT_ID,
              ticket_selections: [{ ticketTypeId: "tt-vip", quantity: 1 }],
              quantity: 1,
            },
          },
        }),
      })
    );
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Paystack metadata selections even if the client sends synthetic default", async () => {
    const result = await resolveAndVerifyPurchase(
      "R1",
      EVENT_ID,
      [{ ticketTypeId: "default", quantity: 9 }],
      9,
      { email: "other@example.com" }
    );
    expect(result.ok).toBe(true);
    expect(computeExpectedAmountKobo).toHaveBeenCalledWith(EVENT_ID, [{ ticketTypeId: "tt-vip", quantity: 1 }], undefined);
    if (result.ok) {
      expect(result.purchase.ticketSelections).toEqual([{ ticketTypeId: "tt-vip", quantity: 1 }]);
      expect(result.purchase.quantity).toBeUndefined();
    }
  });

  it("rejects amount mismatch after Paystack verify", async () => {
    vi.mocked(computeExpectedAmountKobo).mockResolvedValue({ amountKobo: 50000, currency: "ZAR" });
    const result = await resolveAndVerifyPurchase("R1", EVENT_ID);
    expect(result).toEqual({
      ok: false,
      error: "Payment amount does not match ticket total",
      status: 400,
    });
  });
});
