import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { generateOrganizerInvoice } from "@/server/invoices/generateOrganizerInvoice";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireOrganizerAuth: vi.fn(),
}));

vi.mock("@/server/invoices/generateOrganizerInvoice", () => ({
  generateOrganizerInvoice: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const organizer = { id: "org-1", email: "org@test.com" };

describe("POST /api/invoices/generate", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireOrganizerAuth).mockReset();
    vi.mocked(generateOrganizerInvoice).mockReset();
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: true,
      user: organizer,
    } as never);
  });

  function jsonPost(body: unknown) {
    return new NextRequest("http://localhost/api/invoices/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer token",
      },
      body: JSON.stringify(body),
    });
  }

  it("rejects unauthenticated organizers", async () => {
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(401);
    expect(generateOrganizerInvoice).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-uuid event id", async () => {
    const res = await POST(jsonPost({ eventId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    expect(generateOrganizerInvoice).not.toHaveBeenCalled();
  });

  it("surfaces eligibility errors from the server generator", async () => {
    vi.mocked(generateOrganizerInvoice).mockResolvedValue({
      ok: false,
      status: 400,
      error: "Invoices can only be generated after the event date and time have passed.",
    });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/after the event/i);
  });

  it("returns the draft invoice on success", async () => {
    vi.mocked(generateOrganizerInvoice).mockResolvedValue({
      ok: true,
      invoice: { id: "inv-1", status: "draft", event_id: EVENT_ID },
    } as never);
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.invoice.status).toBe("draft");
    expect(generateOrganizerInvoice).toHaveBeenCalledWith(organizer, EVENT_ID);
  });
});
