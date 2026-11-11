import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  canScanEvent,
  getScannerRoleForClient,
  hasConfirmedEmail,
  hasOrganizerProductRole,
  hasPlatformScannerAccess,
  linkPendingScannerMemberships,
} from "@/server/auth/scannerAuth";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function mockUser(partial: Partial<User>): User {
  return {
    id: "user-1",
    aud: "authenticated",
    created_at: "",
    app_metadata: {},
    user_metadata: {},
    ...partial,
  } as User;
}

describe("scannerAuth role helpers", () => {
  it("grants platform access from app_metadata admin", () => {
    const user = mockUser({
      app_metadata: { role: "admin" },
      user_metadata: { role: "attendee" },
    });
    expect(hasPlatformScannerAccess(user)).toBe(true);
    expect(getScannerRoleForClient(user)).toBe("admin");
  });

  it("grants platform access from app_metadata staff", () => {
    const user = mockUser({
      app_metadata: { role: "staff" },
      user_metadata: { role: "organizer" },
    });
    expect(hasPlatformScannerAccess(user)).toBe(true);
    expect(getScannerRoleForClient(user)).toBe("staff");
  });

  it("does not treat user_metadata admin as platform access", () => {
    const user = mockUser({
      app_metadata: {},
      user_metadata: { role: "admin" },
    });
    expect(hasPlatformScannerAccess(user)).toBe(false);
    expect(getScannerRoleForClient(user)).toBe("attendee");
  });

  it("detects organizer from user_metadata only", () => {
    const user = mockUser({
      app_metadata: {},
      user_metadata: { role: "organizer" },
    });
    expect(hasOrganizerProductRole(user)).toBe(true);
    expect(getScannerRoleForClient(user)).toBe("organizer");
  });
});

function queryBuilder(row: unknown) {
  const builder = {
    update: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => void) =>
      resolve({ data: row, error: null }),
  };
  return builder;
}

describe("email-confirmed scanner membership", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("does not treat a missing confirmation timestamp as proof", () => {
    expect(hasConfirmedEmail(mockUser({ email_confirmed_at: undefined }))).toBe(false);
    expect(hasConfirmedEmail(mockUser({ email_confirmed_at: "  " }))).toBe(false);
    expect(hasConfirmedEmail(mockUser({ email_confirmed_at: "2026-11-05T00:00:00Z" }))).toBe(
      true
    );
  });

  it("does not link an unconfirmed account to an invite", async () => {
    const from = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    await linkPendingScannerMemberships(
      mockUser({
        id: "attacker",
        email: "door@example.com",
        email_confirmed_at: undefined,
      })
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("links only after email_confirmed_at is set", async () => {
    const members = queryBuilder(null);
    const from = vi.fn(() => members);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    await linkPendingScannerMemberships(
      mockUser({
        id: "volunteer",
        email: "Door@Example.com",
        email_confirmed_at: "2026-11-05T00:00:00Z",
      })
    );
    expect(members.update).toHaveBeenCalledWith({ user_id: "volunteer" });
    expect(members.eq).toHaveBeenCalledWith("invited_email", "door@example.com");
  });

  it("keeps app_metadata staff access without an email confirmation", async () => {
    const from = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    const allowed = await canScanEvent(
      mockUser({
        app_metadata: { role: "staff" },
        user_metadata: { role: "attendee" },
        email_confirmed_at: undefined,
      }),
      "event-1"
    );
    expect(allowed).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("does not let an unconfirmed user scan through a preexisting user_id link", async () => {
    const members = queryBuilder({ id: "already-linked" });
    const from = vi.fn(() => members);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    const allowed = await canScanEvent(
      mockUser({
        id: "attacker",
        email: "door@example.com",
        email_confirmed_at: undefined,
        app_metadata: {},
        user_metadata: { role: "attendee" },
      }),
      "event-1"
    );
    expect(allowed).toBe(false);
    expect(members.eq).not.toHaveBeenCalledWith("invited_email", "door@example.com");
  });

  it("does not grant invite access from an unconfirmed email match", async () => {
    const members = queryBuilder(null);
    const from = vi.fn(() => members);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    const allowed = await canScanEvent(
      mockUser({
        id: "attacker",
        email: "door@example.com",
        email_confirmed_at: undefined,
        app_metadata: {},
        user_metadata: { role: "attendee" },
      }),
      "event-1"
    );
    expect(allowed).toBe(false);
    expect(members.eq).not.toHaveBeenCalledWith("invited_email", "door@example.com");
  });

  it("allows a confirmed invited email to scan before the row is linked", async () => {
    const byUser = queryBuilder(null);
    const byEmail = queryBuilder({ id: "membership-1" });
    const from = vi
      .fn()
      .mockReturnValueOnce(byUser)
      .mockReturnValueOnce(byEmail);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    const allowed = await canScanEvent(
      mockUser({
        id: "volunteer",
        email: "door@example.com",
        email_confirmed_at: "2026-11-05T00:00:00Z",
        app_metadata: {},
        user_metadata: { role: "attendee" },
      }),
      "event-1"
    );
    expect(allowed).toBe(true);
    expect(byEmail.eq).toHaveBeenCalledWith("invited_email", "door@example.com");
  });
});
