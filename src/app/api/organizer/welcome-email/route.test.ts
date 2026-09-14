import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { sendOrganizerWelcomeEmail } from "@/server/email/sendOrganizerWelcomeEmail";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireOrganizerAuth: vi.fn(),
}));

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/server/email/sendOrganizerWelcomeEmail", () => ({
  sendOrganizerWelcomeEmail: vi.fn(),
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
    vi.mocked(getSupabaseAdmin).mockReset();
    vi.mocked(sendOrganizerWelcomeEmail).mockReset();
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

  function mockEvent(row: { id: string; title: string; organizer_id: string } | null) {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn(() => chain) } as never);
  }

  it("does not grant staff and rejects non-organizers", async () => {
    vi.mocked(requireOrganizerAuth).mockResolvedValue({
      ok: false,
      status: 403,
      error: "Organizer access required",
    });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(403);
    expect(sendOrganizerWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects sending for an event the user does not own", async () => {
    mockEvent({ id: EVENT_ID, title: "Jazz", organizer_id: "other" });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(403);
    expect(sendOrganizerWelcomeEmail).not.toHaveBeenCalled();
  });

  it("returns sent:false when email is not configured, without failing the request", async () => {
    mockEvent({ id: EVENT_ID, title: "Jazz", organizer_id: organizer.id });
    vi.mocked(sendOrganizerWelcomeEmail).mockResolvedValue({
      ok: false,
      skipped: true,
      reason: "not_configured",
    });
    const res = await POST(jsonPost({ eventId: EVENT_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, sent: false, reason: "not_configured" });
  });
});
