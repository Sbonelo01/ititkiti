import { describe, it, expect, vi, beforeEach } from "vitest";
import { canAccessInvoice, requireOrganizerAuth } from "./sessionAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function mockGetUser(user: Record<string, unknown> | null) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    auth: { getUser },
  } as never);
}

describe("requireOrganizerAuth", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("allows organizer from user_metadata", async () => {
    mockGetUser({
      id: "org-1",
      user_metadata: { role: "organizer" },
      app_metadata: {},
    });
    const result = await requireOrganizerAuth("Bearer token");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe("org-1");
  });

  it("does not treat user_metadata admin as organizer", async () => {
    mockGetUser({
      id: "u1",
      user_metadata: { role: "admin" },
      app_metadata: {},
    });
    await expect(requireOrganizerAuth("Bearer token")).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Organizer access required",
    });
  });
});

describe("canAccessInvoice", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("allows the matching organizer", async () => {
    mockGetUser({
      id: "org-1",
      user_metadata: { role: "organizer" },
      app_metadata: {},
    });
    const result = await canAccessInvoice("Bearer token", "org-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.isStaff).toBe(false);
  });

  it("allows staff via app_metadata for another organizer's invoice", async () => {
    mockGetUser({
      id: "staff-1",
      user_metadata: { role: "attendee" },
      app_metadata: { role: "staff" },
    });
    const result = await canAccessInvoice("Bearer token", "org-other");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.isStaff).toBe(true);
  });

  it("rejects user_metadata staff spoofing", async () => {
    mockGetUser({
      id: "u1",
      user_metadata: { role: "staff" },
      app_metadata: {},
    });
    await expect(canAccessInvoice("Bearer token", "org-other")).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });
});
