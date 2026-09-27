import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { createOrganizerEvent } from "@/server/events/createOrganizerEvent";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireOrganizerAuth: vi.fn(),
}));

vi.mock("@/server/events/createOrganizerEvent", () => ({
  createOrganizerEvent: vi.fn(),
}));

const organizer = {
  id: "org-1",
  email: "org@test.com",
  user_metadata: { name: "Ada" },
};

const body = {
  title: "Jazz Night",
  description: "Live set",
  date: "2026-10-01T18:00:00.000Z",
  location: "Cape Town",
  poster_url: "https://example.com/poster.jpg",
  ticket_types: [{ name: "General", price: 100, quantity: 40 }],
};

describe("POST /api/events", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireOrganizerAuth).mockReset();
    vi.mocked(createOrganizerEvent).mockReset();
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: true,
      user: organizer,
    } as never);
  });

  function jsonPost(payload: unknown) {
    return new NextRequest("http://localhost/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer token",
      },
      body: JSON.stringify(payload),
    });
  }

  it("rejects non-organizers before creating an event", async () => {
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Organizer access required",
    });
    const res = await POST(jsonPost(body));
    expect(res.status).toBe(403);
    expect(createOrganizerEvent).not.toHaveBeenCalled();
  });

  it("creates the event and returns the welcome email status", async () => {
    vi.mocked(createOrganizerEvent).mockResolvedValue({
      ok: true,
      event: { id: "evt-1", title: "Jazz Night" },
      welcomeEmail: { sent: true },
    });
    const res = await POST(jsonPost(body));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      event: { id: "evt-1", title: "Jazz Night" },
      welcomeEmail: { sent: true },
    });
    expect(createOrganizerEvent).toHaveBeenCalledWith(
      organizer,
      expect.objectContaining({
        title: "Jazz Night",
        posterUrl: body.poster_url,
        ticketTypes: [{ name: "General", price: 100, quantity: 40, description: null }],
      })
    );
  });

  it("returns the event when the welcome email was not sent", async () => {
    vi.mocked(createOrganizerEvent).mockResolvedValue({
      ok: true,
      event: { id: "evt-1", title: "Jazz Night" },
      welcomeEmail: { sent: false, reason: "not_configured" },
    });
    const res = await POST(jsonPost(body));
    expect(res.status).toBe(201);
    const payload = await res.json();
    expect(payload.welcomeEmail).toEqual({ sent: false, reason: "not_configured" });
  });

  it("rejects an empty ticket list", async () => {
    const res = await POST(jsonPost({ ...body, ticket_types: [] }));
    expect(res.status).toBe(400);
    expect(createOrganizerEvent).not.toHaveBeenCalled();
  });
});
