import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { requireEventOrganizer } from "@/server/events/eventOrganizerAuth";
import { requireSession } from "@/server/auth/sessionAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { SUPER_ADMIN_EMAIL } from "@/utils/superAdmin";

vi.mock("@/server/auth/sessionAuth", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const OWNER_ID = "owner-1";

function user(partial: Partial<User>): User {
  return {
    id: OWNER_ID,
    aud: "authenticated",
    created_at: "",
    email: "owner@example.com",
    app_metadata: {},
    user_metadata: { role: "attendee" },
    ...partial,
  } as User;
}

describe("requireEventOrganizer", () => {
  const maybeSingle = vi.fn();

  beforeEach(() => {
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({
      data: { id: EVENT_ID, organizer_id: OWNER_ID },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
    } as never);
  });

  it("allows the event owner without reading user_metadata", async () => {
    const owner = user({ user_metadata: { role: "attendee" } });
    vi.mocked(requireSession).mockResolvedValue({ ok: true, user: owner });
    const result = await requireEventOrganizer("Bearer token", EVENT_ID);
    expect(result).toEqual({ ok: true, user: owner, eventId: EVENT_ID });
  });

  it("allows the super-admin for an event they do not own", async () => {
    const admin = user({
      id: "super-1",
      email: SUPER_ADMIN_EMAIL,
      app_metadata: { role: "admin" },
      user_metadata: { role: "attendee" },
    });
    vi.mocked(requireSession).mockResolvedValue({ ok: true, user: admin });
    const result = await requireEventOrganizer("Bearer token", EVENT_ID);
    expect(result.ok).toBe(true);
  });

  it("rejects another organizer, a user_metadata admin, and a non-super staff admin", async () => {
    const cases = [
      user({ id: "other", user_metadata: { role: "organizer" } }),
      user({ id: "meta", user_metadata: { role: "admin" }, app_metadata: {} }),
      user({
        id: "staff-admin",
        email: "admin@example.com",
        app_metadata: { role: "admin" },
        user_metadata: {},
      }),
    ];
    for (const account of cases) {
      vi.mocked(requireSession).mockResolvedValue({ ok: true, user: account });
      const result = await requireEventOrganizer("Bearer token", EVENT_ID);
      expect(result).toMatchObject({ ok: false, status: 403 });
    }
  });

  it("returns 404 when the event is missing and 401 without a session", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    vi.mocked(requireSession).mockResolvedValue({ ok: true, user: user({}) });
    const missing = await requireEventOrganizer("Bearer token", EVENT_ID);
    expect(missing).toMatchObject({ ok: false, status: 404 });

    vi.mocked(requireSession).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const anonymous = await requireEventOrganizer(null, EVENT_ID);
    expect(anonymous).toMatchObject({ ok: false, status: 401 });
  });
});
