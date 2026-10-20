import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteOrigin } from "@/utils/eventShare";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  formatEventWhen,
  resolveTicketFaceValue,
  sendPurchaseConfirmationEmail,
  type SendPurchaseConfirmationEmailInput,
  type SendPurchaseConfirmationEmailResult,
  type TicketTypeEmbed,
} from "@/server/email/sendPurchaseConfirmationEmail";

const CLAIM_TTL_MS = 60_000;
const RETRY_DELAYS_MS = [0, 250, 750];
/**
 * The overlapping caller (purchase API vs Paystack webhook) waits out a
 * short in-flight claim. Long enough for Brevo's retry delays, short enough
 * to stay inside a normal serverless limit. The HTTP response is not waiting:
 * this runs from after().
 */
const IN_FLIGHT_WAIT_SLICE_MS = 200;
const IN_FLIGHT_WAIT_BUDGET_MS = 4_000;
const LOG_PREFIX = "[purchase-confirmation-email]";

export type PurchaseConfirmationPurchase = {
  reference: string;
  to: string;
  buyerName?: string;
  eventId: string;
  eventTitle: string;
  eventWhen: string;
  venue: string;
  tickets: SendPurchaseConfirmationEmailInput["tickets"];
};

export type LoadPurchaseResult =
  | { ok: true; purchase: PurchaseConfirmationPurchase }
  | { ok: false; reason: "not_found" | "no_recipient" | "not_ready" | "error" };

export type DeliverPurchaseConfirmationEmailResult =
  | { outcome: "sent"; id: string }
  | {
      outcome: "skipped";
      reason: "already_sent" | "in_flight" | "not_configured" | "no_recipient" | "missing_table";
    }
  | { outcome: "failed"; reason: string }
  | { outcome: "not_found" }
  | { outcome: "error"; status: 500; error: string };

type ClaimRow = {
  reference: string;
  event_id: string;
  email: string;
  sent_at: string | null;
  claimed_at: string;
};

type InsertClaimResult = {
  inserted: boolean;
  conflict: boolean;
  error: boolean;
  missingTable?: boolean;
};

export type PurchaseConfirmationDb = {
  load(reference: string): Promise<LoadPurchaseResult>;
  findClaim(reference: string): Promise<{ row: ClaimRow | null; error: boolean }>;
  insertClaim(row: {
    reference: string;
    event_id: string;
    email: string;
    claimed_at: string;
  }): Promise<InsertClaimResult>;
  takeoverStaleClaim(
    reference: string,
    claimedAt: string,
    staleBefore: string
  ): Promise<{ taken: boolean; error: boolean }>;
  markSent(reference: string, sentAt: string, providerId: string): Promise<{ error: boolean }>;
  releaseClaim(reference: string): Promise<{ error: boolean }>;
};

type ClaimResult = "claimed" | "already_sent" | "in_flight" | "missing_table" | "error";

type ConfirmationLog = (message: string, details: Record<string, string>) => void;

type ReceiptRow = {
  reference: string;
  event_id: string;
  email: string | null;
  payload: unknown;
  created_at: string;
};

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  price: number | string | null;
};

type TicketRow = {
  id: string;
  attendee_name: string | null;
  qr_code_data: string | null;
  created_at: string;
  ticket_types: TicketTypeEmbed;
};

export function purchaseConfirmationIdempotencyKey(reference: string): string {
  return `purchase-confirmation:${reference}`;
}

/** Positive whole quantity. Matches the `::integer` cast in finalize_ticket_purchase. */
function wholeQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 1) return 0;
  return Math.trunc(quantity);
}

/** Quantity stored on the payment receipt. Selections win, matching finalize. */
export function expectedTicketCount(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { quantity?: unknown; ticket_selections?: unknown };
  if (Array.isArray(record.ticket_selections) && record.ticket_selections.length > 0) {
    let total = 0;
    for (const row of record.ticket_selections) {
      if (!row || typeof row !== "object") continue;
      total += wholeQuantity((row as { quantity?: unknown }).quantity);
    }
    return total > 0 ? total : null;
  }
  const quantity = wholeQuantity(record.quantity);
  return quantity > 0 ? quantity : null;
}

function nameFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const ticketUser = (payload as { ticket_user?: unknown }).ticket_user;
  if (!ticketUser || typeof ticketUser !== "object") return undefined;
  const name = (ticketUser as { name?: unknown }).name;
  if (typeof name !== "string") return undefined;
  const trimmed = name.trim();
  return trimmed || undefined;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return (error.message ?? "").includes("purchase_confirmation_emails");
}

function defaultLog(message: string, details: Record<string, string>): void {
  console.error(message, details);
}

function defaultWarn(message: string, details: Record<string, string>): void {
  console.warn(message, details);
}

function isRetryableFailure(result: SendPurchaseConfirmationEmailResult): boolean {
  if (result.ok || result.skipped) return false;
  return (
    result.reason === "network_error" ||
    result.reason === "brevo_http_429" ||
    result.reason.startsWith("brevo_http_5")
  );
}

export function createSupabasePurchaseConfirmationDb(supabase: SupabaseClient): PurchaseConfirmationDb {
  return {
    async load(reference) {
      const { data: receiptData, error: receiptError } = await supabase
        .from("payment_receipts")
        .select("reference, event_id, email, payload, created_at")
        .eq("reference", reference)
        .maybeSingle();
      if (receiptError) return { ok: false, reason: "error" };
      const receipt = receiptData as ReceiptRow | null;
      if (!receipt) return { ok: false, reason: "not_found" };

      const to = receipt.email?.trim() ?? "";
      if (!to) return { ok: false, reason: "no_recipient" };

      const expected = expectedTicketCount(receipt.payload);
      if (expected == null) return { ok: false, reason: "error" };

      const [eventResult, ticketResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, date, location, price")
          .eq("id", receipt.event_id)
          .maybeSingle(),
        supabase
          .from("tickets")
          .select("id, attendee_name, qr_code_data, created_at, ticket_types(name, price)")
          .eq("event_id", receipt.event_id)
          .eq("email", to)
          .eq("payment_status", "paid")
          .gte("created_at", receipt.created_at)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .limit(expected),
      ]);

      if (eventResult.error || ticketResult.error) return { ok: false, reason: "error" };
      const event = eventResult.data as EventRow | null;
      if (!event) return { ok: false, reason: "error" };

      // Tickets do not store the Paystack reference (20260430). The receipt row
      // is inserted first in the same transaction, so this purchase is the first
      // `expected` paid tickets for that email at or after receipt.created_at.
      const rows = ((ticketResult.data as TicketRow[] | null) ?? []).slice(0, expected);
      if (rows.length < expected) return { ok: false, reason: "not_ready" };

      const eventPrice = Number(event.price) || 0;
      const tickets: PurchaseConfirmationPurchase["tickets"] = [];
      for (const row of rows) {
        const qrCodeData = row.qr_code_data?.trim() ?? "";
        if (!qrCodeData) return { ok: false, reason: "not_ready" };
        const face = resolveTicketFaceValue(row.ticket_types, eventPrice);
        const attendeeName = row.attendee_name?.trim() || "Attendee";
        tickets.push({
          typeName: face.typeName,
          attendeeName,
          unitPriceZar: face.unitPriceZar,
          qrCodeData,
        });
      }

      const buyerName = nameFromPayload(receipt.payload) || tickets[0]?.attendeeName;
      return {
        ok: true,
        purchase: {
          reference: receipt.reference,
          to,
          buyerName,
          eventId: event.id,
          eventTitle: event.title,
          eventWhen: formatEventWhen(event.date),
          venue: event.location?.trim() || "Venue to be confirmed",
          tickets,
        },
      };
    },
    async findClaim(reference) {
      const { data, error } = await supabase
        .from("purchase_confirmation_emails")
        .select("reference, event_id, email, sent_at, claimed_at")
        .eq("reference", reference)
        .maybeSingle();
      return {
        row: (data as ClaimRow | null) ?? null,
        error: Boolean(error),
      };
    },
    async insertClaim(row) {
      const { data, error } = await supabase
        .from("purchase_confirmation_emails")
        .insert({
          reference: row.reference,
          event_id: row.event_id,
          email: row.email,
          claimed_at: row.claimed_at,
        })
        .select("reference")
        .maybeSingle();
      if (!error && data) {
        return { inserted: true, conflict: false, error: false };
      }
      if (isUniqueViolation(error)) {
        return { inserted: false, conflict: true, error: false };
      }
      if (isMissingRelation(error)) {
        return { inserted: false, conflict: false, error: true, missingTable: true };
      }
      return { inserted: false, conflict: false, error: true };
    },
    async takeoverStaleClaim(reference, claimedAt, staleBefore) {
      const { data, error } = await supabase
        .from("purchase_confirmation_emails")
        .update({ claimed_at: claimedAt })
        .eq("reference", reference)
        .is("sent_at", null)
        .lt("claimed_at", staleBefore)
        .select("reference")
        .maybeSingle();
      return { taken: Boolean(data) && !error, error: Boolean(error) };
    },
    async markSent(reference, sentAt, providerId) {
      const { error } = await supabase
        .from("purchase_confirmation_emails")
        .update({ sent_at: sentAt, provider_id: providerId })
        .eq("reference", reference)
        .is("sent_at", null);
      return { error: Boolean(error) };
    },
    async releaseClaim(reference) {
      const { error } = await supabase
        .from("purchase_confirmation_emails")
        .delete()
        .eq("reference", reference)
        .is("sent_at", null);
      return { error: Boolean(error) };
    },
  };
}

export async function claimPurchaseConfirmationEmail(
  db: PurchaseConfirmationDb,
  purchase: Pick<PurchaseConfirmationPurchase, "reference" | "eventId" | "to">,
  nowMs: number
): Promise<ClaimResult> {
  const claimedAt = new Date(nowMs).toISOString();
  const inserted = await db.insertClaim({
    reference: purchase.reference,
    event_id: purchase.eventId,
    email: purchase.to,
    claimed_at: claimedAt,
  });
  if (inserted.missingTable) return "missing_table";
  if (inserted.error) return "error";
  if (inserted.inserted) return "claimed";
  if (!inserted.conflict) return "error";

  const existing = await db.findClaim(purchase.reference);
  if (existing.error) return "error";
  // Unique conflict whose row is not visible yet, or was just released after a
  // failed send. The caller waits and tries again instead of sending blind.
  if (!existing.row) return "in_flight";
  if (existing.row.sent_at) return "already_sent";

  const age = nowMs - new Date(existing.row.claimed_at).getTime();
  if (Number.isFinite(age) && age < CLAIM_TTL_MS) return "in_flight";

  const taken = await db.takeoverStaleClaim(
    purchase.reference,
    claimedAt,
    new Date(nowMs - CLAIM_TTL_MS).toISOString()
  );
  if (taken.error) return "error";
  return taken.taken ? "claimed" : "in_flight";
}

async function claimOrWait(
  db: PurchaseConfirmationDb,
  purchase: PurchaseConfirmationPurchase,
  nowMs: number,
  sleep: (ms: number) => Promise<void>
): Promise<ClaimResult> {
  let observedAt = nowMs;
  for (;;) {
    const result = await claimPurchaseConfirmationEmail(db, purchase, observedAt);
    if (result !== "in_flight") return result;
    if (observedAt - nowMs >= IN_FLIGHT_WAIT_BUDGET_MS) return "in_flight";
    await sleep(IN_FLIGHT_WAIT_SLICE_MS);
    observedAt += IN_FLIGHT_WAIT_SLICE_MS;
  }
}

async function sendWithRetry(
  input: SendPurchaseConfirmationEmailInput,
  send: typeof sendPurchaseConfirmationEmail,
  sleep: (ms: number) => Promise<void>
): Promise<SendPurchaseConfirmationEmailResult> {
  let last: SendPurchaseConfirmationEmailResult = {
    ok: false,
    skipped: false,
    reason: "not_attempted",
  };
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = RETRY_DELAYS_MS[attempt] ?? 0;
    if (delay > 0) await sleep(delay);
    last = await send(input);
    if (!isRetryableFailure(last)) return last;
  }
  return last;
}

export async function deliverPurchaseConfirmationEmail(
  input: { reference: string },
  deps: {
    db?: PurchaseConfirmationDb;
    send?: typeof sendPurchaseConfirmationEmail;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    log?: ConfirmationLog;
    warn?: ConfirmationLog;
  } = {}
): Promise<DeliverPurchaseConfirmationEmailResult> {
  const db = deps.db ?? createSupabasePurchaseConfirmationDb(getSupabaseAdmin());
  const send = deps.send ?? sendPurchaseConfirmationEmail;
  const sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const nowMs = deps.now?.() ?? Date.now();
  const log = deps.log ?? defaultLog;
  const warn = deps.warn ?? defaultWarn;
  const reference = input.reference.trim();
  if (!reference) return { outcome: "not_found" };

  const loaded = await db.load(reference);
  if (!loaded.ok) {
    switch (loaded.reason) {
      case "not_found":
        return { outcome: "not_found" };
      case "no_recipient":
        warn(`${LOG_PREFIX} purchase has no purchaser email; confirmation was not sent`, {
          reference,
          reason: "no_recipient",
        });
        return { outcome: "skipped", reason: "no_recipient" };
      case "not_ready":
        log(`${LOG_PREFIX} tickets for this payment are not ready; confirmation was not sent`, {
          reference,
          reason: "not_ready",
        });
        return { outcome: "failed", reason: "not_ready" };
      case "error":
        log(`${LOG_PREFIX} failed to load purchase`, { reference, reason: "load_failed" });
        return { outcome: "error", status: 500, error: "Failed to load purchase" };
      default: {
        const _exhaustive: never = loaded.reason;
        return _exhaustive;
      }
    }
  }

  const purchase = loaded.purchase;
  const claim = await claimOrWait(db, purchase, nowMs, sleep);
  if (claim === "already_sent") return { outcome: "skipped", reason: "already_sent" };
  if (claim === "in_flight") return { outcome: "skipped", reason: "in_flight" };
  if (claim === "missing_table") {
    log(
      `${LOG_PREFIX} public.purchase_confirmation_emails is missing. Apply supabase/migrations/20261020_purchase_confirmation_emails.sql. Confirmation email was not sent, so the two purchase paths cannot double-send.`,
      { reference, eventId: purchase.eventId, reason: "missing_idempotency_table" }
    );
    return { outcome: "skipped", reason: "missing_table" };
  }
  if (claim === "error") {
    log(`${LOG_PREFIX} could not record an idempotency claim; confirmation email was not sent`, {
      reference,
      eventId: purchase.eventId,
      reason: "claim_failed",
    });
    return { outcome: "failed", reason: "claim_failed" };
  }

  let result: SendPurchaseConfirmationEmailResult;
  try {
    result = await sendWithRetry(
      {
        to: purchase.to,
        reference: purchase.reference,
        buyerName: purchase.buyerName,
        eventTitle: purchase.eventTitle,
        eventWhen: purchase.eventWhen,
        venue: purchase.venue,
        dashboardUrl: `${getSiteOrigin()}/dashboard`,
        tickets: purchase.tickets,
        idempotencyKey: purchaseConfirmationIdempotencyKey(purchase.reference),
      },
      send,
      sleep
    );
  } catch (err) {
    await db.releaseClaim(purchase.reference);
    log(`${LOG_PREFIX} failed to send purchase confirmation`, {
      reference,
      eventId: purchase.eventId,
      reason: "unexpected",
      detail: err instanceof Error ? err.message : "unknown",
    });
    return { outcome: "failed", reason: "unexpected" };
  }

  if (result.ok) {
    const marked = await db.markSent(reference, new Date(nowMs).toISOString(), result.id);
    if (marked.error) {
      log(
        `${LOG_PREFIX} Brevo accepted the email but the idempotency row was not updated`,
        { reference, eventId: purchase.eventId, reason: "mark_sent_failed" }
      );
    }
    return { outcome: "sent", id: result.id };
  }

  await db.releaseClaim(reference);

  if (result.skipped) {
    switch (result.reason) {
      case "not_configured":
        warn(
          `${LOG_PREFIX} BREVO_API_KEY is not set; purchase confirmation was not sent. Set BREVO_API_KEY and BREVO_FROM_EMAIL on Vercel.`,
          { reference, eventId: purchase.eventId, reason: "not_configured" }
        );
        return { outcome: "skipped", reason: "not_configured" };
      case "no_recipient":
        warn(`${LOG_PREFIX} purchase has no purchaser email; confirmation was not sent`, {
          reference,
          eventId: purchase.eventId,
          reason: "no_recipient",
        });
        return { outcome: "skipped", reason: "no_recipient" };
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  log(`${LOG_PREFIX} failed to send purchase confirmation`, {
    reference,
    eventId: purchase.eventId,
    reason: result.reason,
    ...(result.detail ? { detail: result.detail } : {}),
  });
  return { outcome: "failed", reason: result.reason };
}

/**
 * Runs after the purchase response is flushed. A Brevo failure is logged and
 * never changes the HTTP result. When after() is unavailable the send is still
 * detached from the caller.
 */
export function schedulePurchaseConfirmationEmail(reference: string): void {
  const trimmed = reference.trim();
  if (!trimmed) return;

  const task = () =>
    deliverPurchaseConfirmationEmail({ reference: trimmed }).catch((err: unknown) => {
      console.error(`${LOG_PREFIX} unexpected error`, {
        reference: trimmed,
        message: err instanceof Error ? err.message : "unknown",
      });
    });

  try {
    after(task);
  } catch (err: unknown) {
    console.warn(`${LOG_PREFIX} could not defer until after the response`, {
      reference: trimmed,
      message: err instanceof Error ? err.message : "unknown",
    });
    void task();
  }
}
