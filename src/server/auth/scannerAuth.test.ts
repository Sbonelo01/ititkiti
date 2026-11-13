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
  sessionEmailIsVerified,
} from "@/server/auth/scannerAuth";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function googleIdentity(
  email: string,
  emailVerified: boolean | string
): NonNullable<User["identities"]> {
  return [
    {
      id: "identity-1",
      user_id: "user-1",
      identity_id: "google-1",
      provider: "google",
      identity_data: { email, email_verified: emailVerified },
    },
  ];
}

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

  it("treats a matching verified Google identity as proof", () => {
    const user = mockUser({
      email: "door@example.com",
      email_confirmed_at: undefined,
      identities: googleIdentity("Door@Example.com", true),
      user_metadata: { email_verified: false },
    });
    expect(sessionEmailIsVerified(user)).toBe(true);
  });

  it("does not treat user_metadata or an unverified Google identity as proof", () => {
    expect(
      sessionEmailIsVerified(
        mockUser({
          email: "door@example.com",
          email_confirmed_at: undefined,
          identities: [],
          user_metadata: { email_verified: true },
        })
      )
    ).toBe(false);
    expect(
      sessionEmailIsVerified(
        mockUser({
          email: "door@example.com",
          email_confirmed_at: undefined,
          identities: googleIdentity("door@example.com", "true"),
        })
      )
    ).toBe(false);
    expect(
      sessionEmailIsVerified(
        mockUser({
          email: "door@example.com",
          email_confirmed_at: undefined,
          identities: googleIdentity("other@example.com", true),
        })
      )
    ).toBe(false);
  });

  it("links a verified Google identity when email_confirmed_at is missing", async () => {
    const members = queryBuilder(null);
    const from = vi.fn(() => members);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    await linkPendingScannerMemberships(
      mockUser({
        id: "volunteer",
        email: "door@example.com",
        email_confirmed_at: undefined,
        identities: googleIdentity("door@example.com", true),
        user_metadata: { email_verified: false },
      })
    );
    expect(members.update).toHaveBeenCalledWith({ user_id: "volunteer" });
    expect(members.is).toHaveBeenCalledWith("user_id", null);
    expect(members.is).toHaveBeenCalledWith("revoked_at", null);
    expect(members.eq).toHaveBeenCalledWith("invited_email", "door@example.com");
  });

  it("does not link when only user_metadata says the email is verified", async () => {
    const from = vi.fn();
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    await linkPendingScannerMemberships(
      mockUser({
        id: "attacker",
        email: "door@example.com",
        email_confirmed_at: undefined,
        identities: [],
        user_metadata: { email_verified: true, role: "admin" },
      })
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("allows a verified Google invite before the row is linked", async () => {
    const byUser = queryBuilder(null);
    const byEmail = queryBuilder({ id: "membership-1" });
    const from = vi.fn().mockReturnValueOnce(byUser).mockReturnValueOnce(byEmail);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    const allowed = await canScanEvent(
      mockUser({
        id: "volunteer",
        email: "door@example.com",
        email_confirmed_at: undefined,
        identities: googleIdentity("door@example.com", true),
        app_metadata: {},
        user_metadata: { role: "attendee" },
      }),
      "event-1"
    );
    expect(allowed).toBe(true);
    expect(byEmail.is).toHaveBeenCalledWith("revoked_at", null);
  });
});
