import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimOrganizerWelcomeEmail,
  createSupabaseWelcomeEmailDb,
  deliverOrganizerWelcomeEmail,
  organizerWelcomeIdempotencyKey,
  type WelcomeEmailDb,
} from "./organizerWelcomeEmailDelivery";
import type { SendOrganizerWelcomeEmailResult } from "./sendOrganizerWelcomeEmail";

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const ORGANIZER_ID = "org-1";

const organizer = {
  id: ORGANIZER_ID,
  email: "org@test.com",
  user_metadata: { name: "Ada Lovelace", company_name: "Analytical Engines" },
};

type ClaimRow = {
  event_id: string;
  organizer_id: string;
  sent_at: string | null;
  claimed_at: string;
  provider_id: string | null;
};

class MemoryWelcomeEmailDb implements WelcomeEmailDb {
  event: { id: string; title: string; organizer_id: string } | null = {
    id: EVENT_ID,
    title: "Jazz Night",
    organizer_id: ORGANIZER_ID,
  };
  eventError = false;
  row: ClaimRow | null = null;
  missingTable = false;
  insertError = false;

  findEvent(): Promise<{ row: MemoryWelcomeEmailDb["event"]; error: boolean }> {
    return Promise.resolve({ row: this.event, error: this.eventError });
  }

  findClaim(): Promise<{ row: ClaimRow | null; error: boolean }> {
    return Promise.resolve({ row: this.row, error: false });
  }

  insertClaim(row: {
    event_id: string;
    organizer_id: string;
    claimed_at: string;
  }): Promise<{ inserted: boolean; conflict: boolean; error: boolean; missingTable?: boolean }> {
    if (this.missingTable) {
      return Promise.resolve({ inserted: false, conflict: false, error: true, missingTable: true });
    }
    if (this.insertError) {
      return Promise.resolve({ inserted: false, conflict: false, error: true });
    }
    if (this.row) {
      return Promise.resolve({ inserted: false, conflict: true, error: false });
    }
    this.row = { ...row, sent_at: null, provider_id: null };
    return Promise.resolve({ inserted: true, conflict: false, error: false });
  }

  takeoverStaleClaim(
    _eventId: string,
    claimedAt: string,
    staleBefore: string
  ): Promise<{ taken: boolean; error: boolean }> {
    if (!this.row || this.row.sent_at || this.row.claimed_at >= staleBefore) {
      return Promise.resolve({ taken: false, error: false });
    }
    this.row.claimed_at = claimedAt;
    return Promise.resolve({ taken: true, error: false });
  }

  markSent(_eventId: string, sentAt: string, providerId: string): Promise<{ error: boolean }> {
    if (!this.row) return Promise.resolve({ error: true });
    this.row.sent_at = sentAt;
    this.row.provider_id = providerId;
    return Promise.resolve({ error: false });
  }

  releaseClaim(): Promise<{ error: boolean }> {
    if (this.row && !this.row.sent_at) this.row = null;
    return Promise.resolve({ error: false });
  }
}

function sentOk(id = "email_1"): SendOrganizerWelcomeEmailResult {
  return { ok: true, id };
}

describe("deliverOrganizerWelcomeEmail", () => {
  function run(
    db: MemoryWelcomeEmailDb,
    send: (input: unknown) => Promise<SendOrganizerWelcomeEmailResult>,
    extras: { now?: () => number; log?: (message: string, details: Record<string, string>) => void } = {}
  ) {
    return deliverOrganizerWelcomeEmail(
      { eventId: EVENT_ID, user: organizer },
      {
        db,
        send: send as never,
        sleep: async () => {},
        now: extras.now ?? (() => Date.parse("2026-09-27T12:00:00.000Z")),
        log: extras.log ?? vi.fn(),
      }
    );
  }

  it("sends once for the owning organizer and records the send", async () => {
    const db = new MemoryWelcomeEmailDb();
    const send = vi.fn().mockResolvedValue(sentOk());
    const first = await run(db, send);
    const second = await run(db, send);

    expect(first).toEqual({ outcome: "sent", id: "email_1" });
    expect(second).toEqual({ outcome: "skipped", reason: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "org@test.com",
        eventTitle: "Jazz Night",
        eventId: EVENT_ID,
        organizerName: "Ada Lovelace",
        idempotencyKey: organizerWelcomeIdempotencyKey(EVENT_ID),
      })
    );
    expect(db.row?.sent_at).toBe("2026-09-27T12:00:00.000Z");
    expect(db.row?.provider_id).toBe("email_1");
  });

  it("does not send for an event the user does not own", async () => {
    const db = new MemoryWelcomeEmailDb();
    db.event = { id: EVENT_ID, title: "Jazz Night", organizer_id: "other" };
    const send = vi.fn();
    const result = await run(db, send);
    expect(result).toEqual({ outcome: "forbidden" });
    expect(send).not.toHaveBeenCalled();
    expect(db.row).toBeNull();
  });

  it("logs and does not record a send when Brevo is not configured", async () => {
    const db = new MemoryWelcomeEmailDb();
    const log = vi.fn();
    const send = vi.fn().mockResolvedValue({
      ok: false,
      skipped: true,
      reason: "not_configured",
    });
    const result = await run(db, send, { log });
    expect(result).toEqual({ outcome: "skipped", reason: "not_configured" });
    expect(db.row).toBeNull();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("BREVO_API_KEY"),
      expect.objectContaining({ eventId: EVENT_ID, reason: "not_configured" })
    );
  });

  it("retries a transient Brevo failure and releases the claim if it still fails", async () => {
    const db = new MemoryWelcomeEmailDb();
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, skipped: false, reason: "brevo_http_500" })
      .mockResolvedValueOnce({ ok: false, skipped: false, reason: "network_error" })
      .mockResolvedValueOnce({ ok: false, skipped: false, reason: "brevo_http_429" });
    const log = vi.fn();
    const failed = await run(db, send, { log });
    expect(failed).toEqual({ outcome: "failed", reason: "brevo_http_429" });
    expect(send).toHaveBeenCalledTimes(3);
    expect(db.row).toBeNull();

    send.mockResolvedValue(sentOk("email_2"));
    const retried = await run(db, send, { log });
    expect(retried).toEqual({ outcome: "sent", id: "email_2" });
    expect(db.row?.provider_id).toBe("email_2");
  });

  it("does not retry a rejected Brevo request", async () => {
    const db = new MemoryWelcomeEmailDb();
    const send = vi.fn().mockResolvedValue({
      ok: false,
      skipped: false,
      reason: "brevo_http_400",
      detail: "sender not verified",
    });
    const result = await run(db, send);
    expect(result).toEqual({ outcome: "failed", reason: "brevo_http_400" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.row).toBeNull();
  });

  it("does not send again while a claim is in flight", async () => {
    const db = new MemoryWelcomeEmailDb();
    const now = Date.parse("2026-09-27T12:00:00.000Z");
    db.row = {
      event_id: EVENT_ID,
      organizer_id: ORGANIZER_ID,
      sent_at: null,
      claimed_at: new Date(now - 5_000).toISOString(),
      provider_id: null,
    };
    const send = vi.fn();
    const result = await run(db, send, { now: () => now });
    expect(result).toEqual({ outcome: "skipped", reason: "in_flight" });
    expect(send).not.toHaveBeenCalled();
  });

  it("takes over a stale claim and sends", async () => {
    const db = new MemoryWelcomeEmailDb();
    const now = Date.parse("2026-09-27T12:00:00.000Z");
    db.row = {
      event_id: EVENT_ID,
      organizer_id: ORGANIZER_ID,
      sent_at: null,
      claimed_at: new Date(now - 120_000).toISOString(),
      provider_id: null,
    };
    const send = vi.fn().mockResolvedValue(sentOk());
    const result = await run(db, send, { now: () => now });
    expect(result).toEqual({ outcome: "sent", id: "email_1" });
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("createSupabaseWelcomeEmailDb claim", () => {
  it("treats a unique violation on an already-sent row as already sent", async () => {
    const sentAt = "2026-09-27T11:00:00.000Z";
    let mode: "insert" | "select" = "select";
    const from = vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.eq = vi.fn(self);
      chain.insert = vi.fn(() => {
        mode = "insert";
        return chain;
      });
      chain.select = vi.fn(() => {
        if (mode !== "insert") mode = "select";
        return chain;
      });
      chain.maybeSingle = vi.fn(async () => {
        if (table !== "organizer_welcome_emails") {
          return { data: null, error: null };
        }
        if (mode === "insert") {
          mode = "select";
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        return {
          data: {
            event_id: EVENT_ID,
            organizer_id: ORGANIZER_ID,
            sent_at: sentAt,
            claimed_at: sentAt,
          },
          error: null,
        };
      });
      return chain;
    });

    const db = createSupabaseWelcomeEmailDb({ from } as unknown as SupabaseClient);
    const result = await claimOrganizerWelcomeEmail(
      db,
      EVENT_ID,
      ORGANIZER_ID,
      Date.parse("2026-09-27T12:00:00.000Z")
    );
    expect(result).toBe("already_sent");
  });
});
