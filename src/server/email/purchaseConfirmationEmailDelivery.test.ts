import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimPurchaseConfirmationEmail,
  createSupabasePurchaseConfirmationDb,
  deliverPurchaseConfirmationEmail,
  expectedTicketCount,
  purchaseConfirmationIdempotencyKey,
  type LoadPurchaseResult,
  type PurchaseConfirmationDb,
  type PurchaseConfirmationPurchase,
} from "./purchaseConfirmationEmailDelivery";
import type { SendPurchaseConfirmationEmailResult } from "./sendPurchaseConfirmationEmail";

const REFERENCE = "PSK-guest-1";
const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const NOW = Date.parse("2026-10-20T12:00:00.000Z");

const purchase: PurchaseConfirmationPurchase = {
  reference: REFERENCE,
  to: "guest@example.com",
  buyerName: "Thandi Nkosi",
  eventId: EVENT_ID,
  eventTitle: "Jazz Night",
  eventWhen: "Saturday, 20 June 2026 at 18:00",
  venue: "The Commons, Cape Town",
  tickets: [
    { typeName: "General", attendeeName: "Thandi Nkosi", unitPriceZar: 100, qrCodeData: "QR-1" },
  ],
};

type ClaimRow = {
  reference: string;
  event_id: string;
  email: string;
  sent_at: string | null;
  claimed_at: string;
  provider_id: string | null;
};

class MemoryConfirmationDb implements PurchaseConfirmationDb {
  loadResult: LoadPurchaseResult = { ok: true, purchase };
  row: ClaimRow | null = null;
  missingTable = false;
  insertError = false;

  load(): Promise<LoadPurchaseResult> {
    return Promise.resolve(this.loadResult);
  }

  findClaim(): Promise<{ row: ClaimRow | null; error: boolean }> {
    return Promise.resolve({ row: this.row, error: false });
  }

  insertClaim(row: {
    reference: string;
    event_id: string;
    email: string;
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
    _reference: string,
    claimedAt: string,
    staleBefore: string
  ): Promise<{ taken: boolean; error: boolean }> {
    if (!this.row || this.row.sent_at || this.row.claimed_at >= staleBefore) {
      return Promise.resolve({ taken: false, error: false });
    }
    this.row.claimed_at = claimedAt;
    return Promise.resolve({ taken: true, error: false });
  }

  markSent(_reference: string, sentAt: string, providerId: string): Promise<{ error: boolean }> {
    if (!this.row || this.row.sent_at) return Promise.resolve({ error: !this.row });
    this.row.sent_at = sentAt;
    this.row.provider_id = providerId;
    return Promise.resolve({ error: false });
  }

  releaseClaim(): Promise<{ error: boolean }> {
    if (this.row && !this.row.sent_at) this.row = null;
    return Promise.resolve({ error: false });
  }
}

function sentOk(id = "email_1"): SendPurchaseConfirmationEmailResult {
  return { ok: true, id };
}

describe("expectedTicketCount", () => {
  it("sums ticket selections and otherwise uses quantity", () => {
    expect(
      expectedTicketCount({
        ticket_selections: [
          { ticketTypeId: "a", quantity: 2 },
          { ticketTypeId: "b", quantity: 1 },
        ],
        quantity: 9,
      })
    ).toBe(3);
    expect(expectedTicketCount({ quantity: 2 })).toBe(2);
    expect(expectedTicketCount({})).toBeNull();
  });
});

describe("deliverPurchaseConfirmationEmail", () => {
  function run(
    db: MemoryConfirmationDb,
    send: (input: unknown) => Promise<SendPurchaseConfirmationEmailResult>,
    extras: {
      now?: () => number;
      log?: (message: string, details: Record<string, string>) => void;
      warn?: (message: string, details: Record<string, string>) => void;
    } = {}
  ) {
    return deliverPurchaseConfirmationEmail(
      { reference: REFERENCE },
      {
        db,
        send: send as never,
        sleep: async () => {},
        now: extras.now ?? (() => NOW),
        log: extras.log ?? vi.fn(),
        warn: extras.warn ?? vi.fn(),
      }
    );
  }

  it("emails the purchaser once and records the send", async () => {
    const db = new MemoryConfirmationDb();
    const send = vi.fn().mockResolvedValue(sentOk());
    const first = await run(db, send);
    const second = await run(db, send);

    expect(first).toEqual({ outcome: "sent", id: "email_1" });
    expect(second).toEqual({ outcome: "skipped", reason: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "guest@example.com",
        reference: REFERENCE,
        buyerName: "Thandi Nkosi",
        eventTitle: "Jazz Night",
        idempotencyKey: purchaseConfirmationIdempotencyKey(REFERENCE),
        dashboardUrl: expect.stringMatching(/\/dashboard$/),
        tickets: [expect.objectContaining({ unitPriceZar: 100, qrCodeData: "QR-1" })],
      })
    );
    expect(db.row?.sent_at).toBe("2026-10-20T12:00:00.000Z");
    expect(db.row?.provider_id).toBe("email_1");
  });

  it("sends exactly one email when two deliveries race", async () => {
    const db = new MemoryConfirmationDb();
    let releaseSend!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    let notifyStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const send = vi.fn(async () => {
      notifyStarted();
      await gate;
      return sentOk();
    });

    const first = run(db, send);
    const second = run(db, send);
    await started;
    await expect(second).resolves.toEqual({ outcome: "skipped", reason: "in_flight" });
    expect(send).toHaveBeenCalledTimes(1);
    releaseSend();
    await expect(first).resolves.toEqual({ outcome: "sent", id: "email_1" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.row?.provider_id).toBe("email_1");
  });

  it("lets the waiting caller send after a failed claim is released", async () => {
    const db = new MemoryConfirmationDb();
    db.row = {
      reference: REFERENCE,
      event_id: EVENT_ID,
      email: "guest@example.com",
      sent_at: null,
      claimed_at: new Date(NOW).toISOString(),
      provider_id: null,
    };
    db.findClaim = () => {
      const row = db.row;
      db.row = null;
      return Promise.resolve({ row, error: false });
    };
    const send = vi.fn().mockResolvedValue(sentOk("email_2"));
    const result = await run(db, send);
    expect(result).toEqual({ outcome: "sent", id: "email_2" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.row?.sent_at).toBe("2026-10-20T12:00:00.000Z");
  });

  it("warns and does not record a send when Brevo is not configured", async () => {
    const db = new MemoryConfirmationDb();
    const warn = vi.fn();
    const send = vi.fn().mockResolvedValue({
      ok: false,
      skipped: true,
      reason: "not_configured",
    });
    const result = await run(db, send, { warn });
    expect(result).toEqual({ outcome: "skipped", reason: "not_configured" });
    expect(db.row).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("BREVO_API_KEY"),
      expect.objectContaining({ reference: REFERENCE, reason: "not_configured" })
    );
  });

  it("retries a transient send failure, leaves it unsent, and allows a later retry", async () => {
    const db = new MemoryConfirmationDb();
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, skipped: false, reason: "brevo_http_500" })
      .mockResolvedValueOnce({ ok: false, skipped: false, reason: "network_error" })
      .mockResolvedValueOnce({ ok: false, skipped: false, reason: "brevo_http_429" });
    const failed = await run(db, send);
    expect(failed).toEqual({ outcome: "failed", reason: "brevo_http_429" });
    expect(send).toHaveBeenCalledTimes(3);
    expect(db.row).toBeNull();

    send.mockResolvedValue(sentOk("email_2"));
    const retried = await run(db, send);
    expect(retried).toEqual({ outcome: "sent", id: "email_2" });
    expect(db.row?.provider_id).toBe("email_2");
    expect(db.row?.sent_at).toBe("2026-10-20T12:00:00.000Z");
  });

  it("does not retry a rejected Brevo request or mark it sent", async () => {
    const db = new MemoryConfirmationDb();
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

  it("does not send again while a fresh claim is in flight", async () => {
    const db = new MemoryConfirmationDb();
    db.row = {
      reference: REFERENCE,
      event_id: EVENT_ID,
      email: "guest@example.com",
      sent_at: null,
      claimed_at: new Date(NOW - 5_000).toISOString(),
      provider_id: null,
    };
    const send = vi.fn();
    const result = await run(db, send);
    expect(result).toEqual({ outcome: "skipped", reason: "in_flight" });
    expect(send).not.toHaveBeenCalled();
    expect(db.row?.sent_at).toBeNull();
  });

  it("takes over a stale claim and sends", async () => {
    const db = new MemoryConfirmationDb();
    db.row = {
      reference: REFERENCE,
      event_id: EVENT_ID,
      email: "guest@example.com",
      sent_at: null,
      claimed_at: new Date(NOW - 120_000).toISOString(),
      provider_id: null,
    };
    const send = vi.fn().mockResolvedValue(sentOk());
    const result = await run(db, send);
    expect(result).toEqual({ outcome: "sent", id: "email_1" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not send when the idempotency table is missing", async () => {
    const db = new MemoryConfirmationDb();
    db.missingTable = true;
    const log = vi.fn();
    const send = vi.fn();
    const result = await run(db, send, { log });
    expect(result).toEqual({ outcome: "skipped", reason: "missing_table" });
    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("20261020_purchase_confirmation_emails.sql"),
      expect.objectContaining({ reason: "missing_idempotency_table" })
    );
  });
});

describe("purchase confirmation migration", () => {
  const sql = readFileSync(
    path.resolve(process.cwd(), "supabase/migrations/20261020_purchase_confirmation_emails.sql"),
    "utf8"
  );

  it("enables RLS and grants the table only to service_role", () => {
    expect(sql).toContain("alter table public.purchase_confirmation_emails enable row level security;");
    expect(sql).toContain(
      "revoke all on table public.purchase_confirmation_emails from public, anon, authenticated;"
    );
    expect(sql).toContain("grant all on table public.purchase_confirmation_emails to service_role;");
    expect(sql).not.toContain("grant all on table public.purchase_confirmation_emails to anon");
    expect(sql).not.toContain("grant all on table public.purchase_confirmation_emails to authenticated");
  });
});

describe("createSupabasePurchaseConfirmationDb claim", () => {
  it("treats a unique violation on an already-sent row as already sent", async () => {
    const sentAt = "2026-10-20T11:00:00.000Z";
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
        if (table !== "purchase_confirmation_emails") {
          return { data: null, error: null };
        }
        if (mode === "insert") {
          mode = "select";
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        return {
          data: {
            reference: REFERENCE,
            event_id: EVENT_ID,
            email: "guest@example.com",
            sent_at: sentAt,
            claimed_at: sentAt,
          },
          error: null,
        };
      });
      return chain;
    });

    const db = createSupabasePurchaseConfirmationDb({ from } as unknown as SupabaseClient);
    const result = await claimPurchaseConfirmationEmail(db, purchase, NOW);
    expect(result).toBe("already_sent");
  });
});
