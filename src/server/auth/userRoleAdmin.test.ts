import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AuthUserLookupUnavailableError,
  findAuthUsersByEmail,
  matchUsersByEmail,
  toAdminUserView,
  updateAuthUserRole,
} from "./userRoleAdmin";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("matchUsersByEmail", () => {
  const users = [
    { id: "1", email: "Ada@Example.com" },
    { id: "2", email: "bob@example.com" },
    { id: "3", email: "ada.staff@other.com" },
  ];

  it("exact-matches when the query contains @", () => {
    expect(matchUsersByEmail(users, "ada@example.com")).toEqual([
      { id: "1", email: "Ada@Example.com" },
    ]);
  });

  it("substring-matches when the query has no @", () => {
    expect(matchUsersByEmail(users, "ada")).toEqual([
      { id: "1", email: "Ada@Example.com" },
      { id: "3", email: "ada.staff@other.com" },
    ]);
  });

  it("ignores short queries", () => {
    expect(matchUsersByEmail(users, "ad")).toEqual([]);
  });
});

describe("toAdminUserView", () => {
  it("exposes id, email, and assignable role only", () => {
    expect(
      toAdminUserView({
        id: "u1",
        email: "staff@test.com",
        app_metadata: { role: "staff", provider: "google" },
        user_metadata: { role: "organizer", name: "Ada" },
      })
    ).toEqual({ id: "u1", email: "staff@test.com", role: "staff" });
  });
});

describe("findAuthUsersByEmail", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("looks up one exact email and does not list users", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "u1",
        email: "staff@test.com",
        app_metadata: { role: "staff" },
        user_metadata: {},
      },
      error: null,
    });
    const listUsers = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      rpc,
      auth: { admin: { listUsers } },
    } as never);

    const users = await findAuthUsersByEmail("staff@test.com");
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe("u1");
    expect(rpc).toHaveBeenCalledWith("lookup_auth_user_by_email", {
      p_email: "staff@test.com",
    });
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("does not query for a partial email", async () => {
    const rpc = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
    await expect(findAuthUsersByEmail("ada")).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when the lookup function is not installed", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST202", message: "Could not find the function public.lookup_auth_user_by_email" },
      }),
    } as never);
    await expect(findAuthUsersByEmail("staff@test.com")).rejects.toBeInstanceOf(
      AuthUserLookupUnavailableError
    );
  });
});

describe("updateAuthUserRole", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("calls updateUserById with staff app_metadata payload", async () => {
    const updateUserById = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "staff@test.com",
          app_metadata: { role: "staff" },
          user_metadata: { role: "attendee" },
        },
      },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: { admin: { updateUserById } },
    } as never);

    const result = await updateAuthUserRole("u1", "staff");
    expect(result.ok).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith("u1", {
      app_metadata: { role: "staff" },
      user_metadata: { role: "attendee" },
    });
  });

  it("does not surface raw admin API errors", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "service role leaked" },
          }),
        },
      },
    } as never);

    await expect(updateAuthUserRole("u1", "admin")).resolves.toEqual({
      ok: false,
      error: "Failed to update user role",
    });
  });
});
