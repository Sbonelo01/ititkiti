import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
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

  it("normalizes surrounding whitespace and rejects a non-address", async () => {
    insert.mockResolvedValueOnce({ error: null });
    const spaced = await POST(post("  Door@Example.com  "), {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });
    expect(spaced.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        invited_email: "door@example.com",
        user_id: null,
      })
    );

    insert.mockClear();
    const invalid = await POST(post("not-an-email"), {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });
    expect(invalid.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
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

describe("GET /api/events/[eventId]/scanner-members", () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(requireEventOrganizer).mockResolvedValue({
      ok: true,
      eventId: EVENT_ID,
      user: { id: "organizer-1" },
    } as never);
  });

  it("returns pending, active, and removed invites", async () => {
    const rows = [
      {
        id: "m1",
        event_id: EVENT_ID,
        user_id: null,
        invited_email: "pending@example.com",
        invited_by: "organizer-1",
        created_at: "2026-11-03T00:00:00Z",
        revoked_at: null,
      },
      {
        id: "m2",
        event_id: EVENT_ID,
        user_id: "user-2",
        invited_email: "active@example.com",
        invited_by: "organizer-1",
        created_at: "2026-11-02T00:00:00Z",
        revoked_at: null,
      },
      {
        id: "m3",
        event_id: EVENT_ID,
        user_id: "user-3",
        invited_email: "removed@example.com",
        invited_by: "organizer-1",
        created_at: "2026-11-01T00:00:00Z",
        revoked_at: "2026-11-04T00:00:00Z",
      },
    ];
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: async () => ({ data: rows, error: null }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: () => builder } as never);

    const res = await GET(
      new NextRequest(`http://localhost/api/events/${EVENT_ID}/scanner-members`, {
        headers: { authorization: "Bearer token" },
      }),
      { params: Promise.resolve({ eventId: EVENT_ID }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members.map((member: { status: string }) => member.status)).toEqual([
      "pending",
      "active",
      "removed",
    ]);
  });
});
