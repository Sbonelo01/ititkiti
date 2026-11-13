import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
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
const MEMBER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("DELETE /api/events/[eventId]/scanner-members/[memberId]", () => {
  const maybeSingle = vi.fn();
  const revoke = vi.fn();

  beforeEach(() => {
    resetRateLimitBucketsForTests();
    maybeSingle.mockReset();
    revoke.mockReset();
    vi.mocked(requireEventOrganizer).mockResolvedValue({
      ok: true,
      eventId: EVENT_ID,
      user: { id: "organizer-1" },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle }),
          }),
        }),
        update: (patch: { revoked_at?: string }) => {
          revoke(patch);
          return {
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        },
      }),
    } as never);
  });

  function remove() {
    return DELETE(
      new NextRequest(`http://localhost/api/events/${EVENT_ID}/scanner-members/${MEMBER_ID}`, {
        method: "DELETE",
        headers: { authorization: "Bearer token" },
      }),
      { params: Promise.resolve({ eventId: EVENT_ID, memberId: MEMBER_ID }) }
    );
  }

  it("revokes an active invite", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: MEMBER_ID, event_id: EVENT_ID, revoked_at: null },
      error: null,
    });
    const res = await remove();
    expect(res.status).toBe(200);
    expect(revoke).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    );
  });

  it("is idempotent when the invite is already removed", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: MEMBER_ID, event_id: EVENT_ID, revoked_at: "2026-11-01T00:00:00Z" },
      error: null,
    });
    const res = await remove();
    expect(res.status).toBe(200);
    expect(revoke).not.toHaveBeenCalled();
  });
});
