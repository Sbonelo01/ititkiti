import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { POST } from "./route";
import { finalizePurchaseAtomic } from "@/server/payments/finalizePurchase";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/payments/finalizePurchase", () => ({
  finalizePurchaseAtomic: vi.fn(),
}));

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha512", secret).update(body).digest("hex");
}

describe("POST /api/paystack/webhook", () => {
  const secret = "test_webhook_secret";

  beforeEach(() => {
    resetRateLimitBucketsForTests();
    process.env.PAYSTACK_WEBHOOK_SECRET = secret;
    delete process.env.PAYSTACK_SECRET_KEY;
    vi.mocked(finalizePurchaseAtomic).mockReset();
  });

  function webhookRequest(raw: string, ip: string, signature: string | null) {
    const headers: Record<string, string> = {
      "x-forwarded-for": ip,
    };
    if (signature !== null) {
      headers["x-paystack-signature"] = signature;
    }
    return new NextRequest("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers,
      body: raw,
    });
  }

  it("returns 401 when signature header is missing", async () => {
    const raw = JSON.stringify({ event: "charge.success" });
    const res = await POST(webhookRequest(raw, "203.0.113.10", null));
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature is invalid", async () => {
    const raw = JSON.stringify({ event: "charge.success" });
    const res = await POST(webhookRequest(raw, "203.0.113.11", "deadbeef"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const raw = "{ not json";
    const res = await POST(
      webhookRequest(raw, "203.0.113.12", sign(raw, secret))
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 ignored for non charge.success events", async () => {
    const body = { event: "transfer.success", data: {} };
    const raw = JSON.stringify(body);
    const res = await POST(
      webhookRequest(raw, "203.0.113.13", sign(raw, secret))
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ignored).toBe(true);
    expect(finalizePurchaseAtomic).not.toHaveBeenCalled();
  });

  it("returns 400 when required metadata is missing", async () => {
    const body = {
      event: "charge.success",
      data: {
        reference: "no-evt-prefix",
        customer: { email: "a@b.com" },
        metadata: {},
      },
    };
    const raw = JSON.stringify(body);
    const res = await POST(
      webhookRequest(raw, "203.0.113.14", sign(raw, secret))
    );
    expect(res.status).toBe(400);
    expect(finalizePurchaseAtomic).not.toHaveBeenCalled();
  });

  it("calls finalizePurchaseAtomic on valid charge.success", async () => {
    vi.mocked(finalizePurchaseAtomic).mockResolvedValue({
      success: true,
      createdTickets: 2,
    });
    const body = {
      event: "charge.success",
      data: {
        reference: "EVT-event-123-u-1",
        customer: { email: "buyer@example.com", name: "Buyer" },
        metadata: {
          event_id: "evt-uuid",
          ticket_selections: [{ ticketTypeId: "tt-1", quantity: 2 }],
        },
      },
    };
    const raw = JSON.stringify(body);
    const res = await POST(
      webhookRequest(raw, "203.0.113.15", sign(raw, secret))
    );
    expect(res.status).toBe(200);
    expect(finalizePurchaseAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: "EVT-event-123-u-1",
        eventId: "evt-uuid",
        ticketSelections: [{ ticketTypeId: "tt-1", quantity: 2 }],
        ticketUser: expect.objectContaining({ email: "buyer@example.com" }),
      })
    );
  });

  it("derives event id from EVT reference when metadata omits event_id", async () => {
    vi.mocked(finalizePurchaseAtomic).mockResolvedValue({ success: true });
    const body = {
      event: "charge.success",
      data: {
        reference: "EVT-abc-def-999",
        customer: { email: "x@y.z" },
        metadata: {},
      },
    };
    const raw = JSON.stringify(body);
    const res = await POST(
      webhookRequest(raw, "203.0.113.16", sign(raw, secret))
    );
    expect(res.status).toBe(200);
    expect(finalizePurchaseAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "abc",
      })
    );
  });

  it("propagates finalize failure status", async () => {
    vi.mocked(finalizePurchaseAtomic).mockResolvedValue({
      success: false,
      error: "Sold out",
      status: 409,
    });
    const body = {
      event: "charge.success",
      data: {
        reference: "EVT-e1-u-1",
        customer: { email: "a@b.com" },
        metadata: { event_id: "e1" },
      },
    };
    const raw = JSON.stringify(body);
    const res = await POST(
      webhookRequest(raw, "203.0.113.17", sign(raw, secret))
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Sold out");
  });
});
