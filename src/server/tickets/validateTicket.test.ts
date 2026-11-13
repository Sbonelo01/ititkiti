import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { validateAndMarkTicketUsedForScanner } from "@/server/tickets/validateTicket";
import type { ValidatedTicket } from "@/server/tickets/validateTicket";

vi.mock("@/server/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";

const ticket: ValidatedTicket = {
  id: "ticket-1",
  attendee_name: "Ann",
  email: "ann@example.com",
  used: false,
  event_id: EVENT_ID,
  created_at: "2026-11-01T00:00:00Z",
};

type Membership = {
  id: string;
  event_id: string;
  user_id: string | null;
  invited_email: string;
  revoked_at: string | null;
};

function mockUser(partial: Partial<User>): User {
  return {
    id: "user-1",
    aud: "authenticated",
    created_at: "",
    app_metadata: {},
    user_metadata: {},
    email: "door@example.com",
    ...partial,
  } as User;
}

function googleIdentity(email: string, verified: boolean): User["identities"] {
  return [
    {
      id: "identity-1",
      user_id: "user-1",
      identity_id: "google-1",
      provider: "google",
      identity_data: { email, email_verified: verified },
    },
  ];
}

function membershipChain(row: Membership | null) {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq(column: string, value: unknown) {
      filters[column] = value;
      return builder;
    },
    is(column: string, value: unknown) {
      filters[`is:${column}`] = value;
      return builder;
    },
    maybeSingle: async () => {
      if (!row) return { data: null, error: null };
      if (filters.event_id !== undefined && filters.event_id !== row.event_id) {
        return { data: null, error: null };
      }
      if (filters.user_id !== undefined && filters.user_id !== row.user_id) {
        return { data: null, error: null };
      }
      if (filters.invited_email !== undefined && filters.invited_email !== row.invited_email) {
        return { data: null, error: null };
      }
      if (filters["is:revoked_at"] === null && row.revoked_at !== null) {
        return { data: null, error: null };
      }
      if (filters["is:user_id"] === null && row.user_id !== null) {
        return { data: null, error: null };
      }
      return { data: { id: row.id }, error: null };
    },
  };
  return builder;
}

function installDb(membership: Membership | null) {
  const markUsed = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "tickets") {
      let updating = false;
      const builder = {
        select: () => builder,
        update: () => {
          updating = true;
          markUsed();
          return builder;
        },
        eq: () => builder,
        single: async () => ({ data: ticket, error: null }),
        maybeSingle: async () =>
          updating ? { data: { ...ticket, used: true }, error: null } : { data: null, error: null },
      };
      return builder;
    }
    if (table === "event_scanner_members") return membershipChain(membership);
    if (table === "events") {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return builder;
    }
    throw new Error(`unexpected table ${table}`);
  });
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
  return { from, markUsed };
}

describe("validate-ticket scanner authorization", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseAdmin).mockReset();
  });

  it("allows an active invited member, including a verified Google account", async () => {
    const { markUsed } = installDb({
      id: "membership-1",
      event_id: EVENT_ID,
      user_id: null,
      invited_email: "door@example.com",
      revoked_at: null,
    });
    const result = await validateAndMarkTicketUsedForScanner(
      "qr-1",
      mockUser({
        id: "volunteer",
        email_confirmed_at: undefined,
        identities: googleIdentity("door@example.com", true),
        app_metadata: {},
        user_metadata: { role: "attendee", email_verified: true },
      })
    );
    expect(result.status).toBe("valid");
    expect(markUsed).toHaveBeenCalledOnce();
  });

  it("denies a removed scanner member on the next request", async () => {
    const { from, markUsed } = installDb({
      id: "membership-1",
      event_id: EVENT_ID,
      user_id: "volunteer",
      invited_email: "door@example.com",
      revoked_at: "2026-11-13T00:00:00Z",
    });
    const result = await validateAndMarkTicketUsedForScanner(
      "qr-1",
      mockUser({
        id: "volunteer",
        email_confirmed_at: "2026-11-05T00:00:00Z",
        identities: googleIdentity("door@example.com", true),
        app_metadata: {},
        user_metadata: {},
      })
    );
    expect(result).toMatchObject({ status: "unauthorized" });
    expect(markUsed).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("event_scanner_members");
  });

  it("denies a Google user who is not a scanner member", async () => {
    const { markUsed } = installDb(null);
    const result = await validateAndMarkTicketUsedForScanner(
      "qr-1",
      mockUser({
        id: "stranger",
        email: "stranger@gmail.com",
        email_confirmed_at: "2026-11-05T00:00:00Z",
        identities: googleIdentity("stranger@gmail.com", true),
        app_metadata: {},
        user_metadata: { role: "admin", email_verified: true },
      })
    );
    expect(result).toMatchObject({ status: "unauthorized" });
    expect(markUsed).not.toHaveBeenCalled();
  });

  it("still allows app_metadata admin without an invite or confirmed email", async () => {
    const { from, markUsed } = installDb(null);
    const result = await validateAndMarkTicketUsedForScanner(
      "qr-1",
      mockUser({
        id: "admin-1",
        email_confirmed_at: undefined,
        identities: [],
        app_metadata: { role: "admin" },
        user_metadata: { role: "attendee" },
      })
    );
    expect(result.status).toBe("valid");
    expect(markUsed).toHaveBeenCalledOnce();
    expect(from).not.toHaveBeenCalledWith("event_scanner_members");
  });
});
