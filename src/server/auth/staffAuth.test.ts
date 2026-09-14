import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractBearerToken, requireStaffAuth } from "./staffAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function mockGetUser(
  user: Record<string, unknown> | null,
  error: { message: string } | null = null
) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error });
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    auth: { getUser },
  } as never);
  return getUser;
}

describe("extractBearerToken", () => {
  it("reads a Bearer token and rejects empty values", () => {
    expect(extractBearerToken("Bearer abc")).toBe("abc");
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Token abc")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });
});

describe("requireStaffAuth", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("rejects a missing access token", async () => {
    await expect(requireStaffAuth(null)).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects user_metadata.role admin/staff", async () => {
    mockGetUser({
      id: "u1",
      user_metadata: { role: "admin" },
      app_metadata: {},
    });
    await expect(requireStaffAuth("token")).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("accepts app_metadata.role staff", async () => {
    mockGetUser({
      id: "staff-1",
      user_metadata: { role: "attendee" },
      app_metadata: { role: "staff" },
    });
    await expect(requireStaffAuth("token")).resolves.toEqual({
      ok: true,
      userId: "staff-1",
      role: "staff",
    });
  });

  it("accepts app_metadata.role admin even if user_metadata is organizer", async () => {
    mockGetUser({
      id: "admin-1",
      user_metadata: { role: "organizer" },
      app_metadata: { role: "admin" },
    });
    await expect(requireStaffAuth("token")).resolves.toEqual({
      ok: true,
      userId: "admin-1",
      role: "admin",
    });
  });
});
