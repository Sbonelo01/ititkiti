import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { deliverOrganizerWelcomeEmail } from "@/server/email/organizerWelcomeEmailDelivery";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireOrganizerAuth: vi.fn(),
}));

vi.mock("@/server/email/organizerWelcomeEmailDelivery", () => ({
  deliverOrganizerWelcomeEmail: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const organizer = {
  id: "org-1",
  email: "org@test.com",
  user_metadata: { name: "Ada" },
};

describe("POST /api/organizer/welcome-email", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireOrganizerAuth).mockReset();
    vi.mocked(deliverOrganizerWelcomeEmail).mockReset();
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: true,
      user: organizer,
    } as never);
  });

  function jsonPost(body: unknown) {
    return new NextRequest("http://localhost/api/organizer/welcome-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer token",
      },
      body: JSON.stringify(body),
    });
  }

  it("does not grant staff and rejects non-organizers", async () => {
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Organizer access required",
    });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(403);
    expect(deliverOrganizerWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects sending for an event the user does not own", async () => {
    vi.mocked(deliverOrganizerWelcomeEmail).mockResolvedValue({ outcome: "forbidden" });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
    expect(deliverOrganizerWelcomeEmail).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      user: organizer,
    });
  });

  it("returns sent:false when email is not configured, without failing the request", async () => {
    vi.mocked(deliverOrganizerWelcomeEmail).mockResolvedValue({
      outcome: "skipped",
      reason: "not_configured",
    });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, sent: false, reason: "not_configured" });
  });

  it("returns sent:true after a successful delivery", async () => {
    vi.mocked(deliverOrganizerWelcomeEmail).mockResolvedValue({
      outcome: "sent",
      id: "email_1",
    });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, sent: true });
  });
});
