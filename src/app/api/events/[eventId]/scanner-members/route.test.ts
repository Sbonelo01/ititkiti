import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireEventOrganizer } from "@/server/events/eventOrganizerAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { resetRateLimitBucketsForTests } from "@/utils/rateLimit";

vi.mock("@/server/events/eventOrganizerAuth", () => ({
  requireEventOrganizer: vi.fn(),
}));

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("POST /api/events/[eventId]/scanner-members", () => {
  const insert = vi.fn();
  const listUsers = vi.fn();

  beforeEach(() => {
    resetRateLimitBucketsForTests();
    insert.mockReset();
    listUsers.mockReset();
    vi.mocked(requireEventOrganizer).mockResolvedValue({
      ok: true,
      eventId: EVENT_ID,
      user: { id: "organizer-1" },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({ insert }),
      auth: { admin: { listUsers } },
    } as never);
  });

  function post(email: string) {
    return new NextRequest(`http://localhost/api/events/${EVENT_ID}/scanner-members`, {
      method: "POST",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
  }

  it("returns the same body for a new invite and an existing invite", async () => {
    insert.mockResolvedValueOnce({ error: null });
    const created = await POST(post("Door@Example.com"), {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });
    insert.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });
    const duplicate = await POST(post("door@example.com"), {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });

    expect(created.status).toBe(200);
    expect(duplicate.status).toBe(200);
    const createdBody = await created.json();
    const duplicateBody = await duplicate.json();
    expect(createdBody).toEqual({ ok: true });
    expect(duplicateBody).toEqual(createdBody);
    expect(insert).toHaveBeenCalledWith({
      event_id: EVENT_ID,
      user_id: null,
      invited_email: "door@example.com",
      invited_by: "organizer-1",
    });
    expect(listUsers).not.toHaveBeenCalled();
    expect(JSON.stringify(createdBody)).not.toContain("user_id");
  });

  it("rate limits repeated invites", async () => {
    insert.mockResolvedValue({ error: null });
    let lastStatus = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const res = await POST(post(`person${attempt}@example.com`), {
        params: Promise.resolve({ eventId: EVENT_ID }),
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
    expect(listUsers).not.toHaveBeenCalled();
  });
});
