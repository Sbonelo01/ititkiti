import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  sendOrganizerWelcomeEmail,
  type SendOrganizerWelcomeEmailInput,
  type SendOrganizerWelcomeEmailResult,
} from "@/server/email/sendOrganizerWelcomeEmail";

const CLAIM_TTL_MS = 60_000;
const RETRY_DELAYS_MS = [0, 250, 750];

export type OrganizerWelcomeRecipient = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type DeliverOrganizerWelcomeEmailResult =
  | { outcome: "sent"; id: string }
  | {
      outcome: "skipped";
      reason: "already_sent" | "in_flight" | "not_configured" | "no_recipient";
    }
  | { outcome: "failed"; reason: string }
  | { outcome: "not_found" }
  | { outcome: "forbidden" }
  | { outcome: "error"; status: 500; error: string };

type WelcomeEventRow = {
  id: string;
  title: string;
  organizer_id: string;
};

type WelcomeClaimRow = {
  event_id: string;
  organizer_id: string;
  sent_at: string | null;
  claimed_at: string;
};

type InsertClaimResult = {
  inserted: boolean;
  conflict: boolean;
  error: boolean;
  missingTable?: boolean;
};

export type WelcomeEmailDb = {
  findEvent(eventId: string): Promise<{ row: WelcomeEventRow | null; error: boolean }>;
  findClaim(eventId: string): Promise<{ row: WelcomeClaimRow | null; error: boolean }>;
  insertClaim(row: {
    event_id: string;
    organizer_id: string;
    claimed_at: string;
  }): Promise<InsertClaimResult>;
  takeoverStaleClaim(
    eventId: string,
    claimedAt: string,
    staleBefore: string
  ): Promise<{ taken: boolean; error: boolean }>;
  markSent(eventId: string, sentAt: string, providerId: string): Promise<{ error: boolean }>;
  releaseClaim(eventId: string): Promise<{ error: boolean }>;
};

type ClaimResult = "claimed" | "already_sent" | "in_flight" | "missing_table" | "error";

type WelcomeEmailLog = (message: string, details: Record<string, string>) => void;

export function organizerWelcomeIdempotencyKey(eventId: string): string {
  return `organizer-welcome:${eventId}`;
}

function organizerDisplayName(user: OrganizerWelcomeRecipient): string | undefined {
  const meta = user.user_metadata ?? {};
  const name = meta.name;
  const company = meta.company_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  if (typeof company === "string" && company.trim()) return company.trim();
  return undefined;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return (error.message ?? "").includes("organizer_welcome_emails");
}

function defaultLog(message: string, details: Record<string, string>): void {
  console.error(message, details);
}

function isRetryableFailure(result: SendOrganizerWelcomeEmailResult): boolean {
  if (result.ok || result.skipped) return false;
  return (
    result.reason === "network_error" ||
    result.reason === "resend_http_429" ||
    result.reason.startsWith("resend_http_5")
  );
}

export function createSupabaseWelcomeEmailDb(supabase: SupabaseClient): WelcomeEmailDb {
  return {
    async findEvent(eventId) {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, organizer_id")
        .eq("id", eventId)
        .maybeSingle();
      return {
        row: (data as WelcomeEventRow | null) ?? null,
        error: Boolean(error),
      };
    },
    async findClaim(eventId) {
      const { data, error } = await supabase
        .from("organizer_welcome_emails")
        .select("event_id, organizer_id, sent_at, claimed_at")
        .eq("event_id", eventId)
        .maybeSingle();
      return {
        row: (data as WelcomeClaimRow | null) ?? null,
        error: Boolean(error),
      };
    },
    async insertClaim(row) {
      const { data, error } = await supabase
        .from("organizer_welcome_emails")
        .insert({
          event_id: row.event_id,
          organizer_id: row.organizer_id,
          claimed_at: row.claimed_at,
        })
        .select("event_id")
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
    async takeoverStaleClaim(eventId, claimedAt, staleBefore) {
      const { data, error } = await supabase
        .from("organizer_welcome_emails")
        .update({ claimed_at: claimedAt })
        .eq("event_id", eventId)
        .is("sent_at", null)
        .lt("claimed_at", staleBefore)
        .select("event_id")
        .maybeSingle();
      return { taken: Boolean(data) && !error, error: Boolean(error) };
    },
    async markSent(eventId, sentAt, providerId) {
      const { error } = await supabase
        .from("organizer_welcome_emails")
        .update({ sent_at: sentAt, provider_id: providerId })
        .eq("event_id", eventId)
        .is("sent_at", null);
      return { error: Boolean(error) };
    },
    async releaseClaim(eventId) {
      const { error } = await supabase
        .from("organizer_welcome_emails")
        .delete()
        .eq("event_id", eventId)
        .is("sent_at", null);
      return { error: Boolean(error) };
    },
  };
}

export async function claimOrganizerWelcomeEmail(
  db: WelcomeEmailDb,
  eventId: string,
  organizerId: string,
  nowMs: number
): Promise<ClaimResult> {
  const claimedAt = new Date(nowMs).toISOString();
  const inserted = await db.insertClaim({
    event_id: eventId,
    organizer_id: organizerId,
    claimed_at: claimedAt,
  });
  if (inserted.missingTable) return "missing_table";
  if (inserted.error) return "error";
  if (inserted.inserted) return "claimed";
  if (!inserted.conflict) return "error";

  const existing = await db.findClaim(eventId);
  if (existing.error || !existing.row) return "error";
  if (existing.row.sent_at) return "already_sent";
  if (existing.row.organizer_id !== organizerId) return "error";

  const age = nowMs - new Date(existing.row.claimed_at).getTime();
  if (Number.isFinite(age) && age < CLAIM_TTL_MS) return "in_flight";

  const taken = await db.takeoverStaleClaim(
    eventId,
    claimedAt,
    new Date(nowMs - CLAIM_TTL_MS).toISOString()
  );
  if (taken.error) return "error";
  return taken.taken ? "claimed" : "in_flight";
}

async function sendWithRetry(
  input: SendOrganizerWelcomeEmailInput,
  send: typeof sendOrganizerWelcomeEmail,
  sleep: (ms: number) => Promise<void>
): Promise<SendOrganizerWelcomeEmailResult> {
  let last: SendOrganizerWelcomeEmailResult = {
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

export async function deliverOrganizerWelcomeEmail(
  input: { eventId: string; user: OrganizerWelcomeRecipient },
  deps: {
    db?: WelcomeEmailDb;
    send?: typeof sendOrganizerWelcomeEmail;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    log?: WelcomeEmailLog;
  } = {}
): Promise<DeliverOrganizerWelcomeEmailResult> {
  const db = deps.db ?? createSupabaseWelcomeEmailDb(getSupabaseAdmin());
  const send = deps.send ?? sendOrganizerWelcomeEmail;
  const sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const nowMs = deps.now?.() ?? Date.now();
  const log = deps.log ?? defaultLog;
  const { eventId, user } = input;

  const event = await db.findEvent(eventId);
  if (event.error) {
    log("[organizer-welcome-email] failed to load event", {
      eventId,
      organizerId: user.id,
      reason: "event_lookup_failed",
    });
    return { outcome: "error", status: 500, error: "Failed to load event" };
  }
  if (!event.row) return { outcome: "not_found" };
  if (event.row.organizer_id !== user.id) return { outcome: "forbidden" };

  const claim = await claimOrganizerWelcomeEmail(db, eventId, user.id, nowMs);
  if (claim === "already_sent") return { outcome: "skipped", reason: "already_sent" };
  if (claim === "in_flight") return { outcome: "skipped", reason: "in_flight" };
  if (claim === "missing_table") {
    log(
      "[organizer-welcome-email] public.organizer_welcome_emails is missing. Apply supabase/migrations/20260927_organizer_welcome_emails.sql. Sending with a Resend idempotency key only.",
      { eventId, organizerId: user.id, reason: "missing_idempotency_table" }
    );
  } else if (claim === "error") {
    log(
      "[organizer-welcome-email] could not record an idempotency claim; sending with a Resend idempotency key",
      { eventId, organizerId: user.id, reason: "claim_failed" }
    );
  }

  const result = await sendWithRetry(
    {
      to: user.email ?? "",
      eventTitle: event.row.title,
      eventId: event.row.id,
      organizerName: organizerDisplayName(user),
      idempotencyKey: organizerWelcomeIdempotencyKey(eventId),
    },
    send,
    sleep
  );

  if (result.ok) {
    if (claim === "claimed") {
      const marked = await db.markSent(eventId, new Date(nowMs).toISOString(), result.id);
      if (marked.error) {
        log(
          "[organizer-welcome-email] Resend accepted the email but the idempotency row was not updated",
          { eventId, organizerId: user.id, reason: "mark_sent_failed" }
        );
      }
    }
    return { outcome: "sent", id: result.id };
  }

  if (claim === "claimed") {
    await db.releaseClaim(eventId);
  }

  if (result.skipped) {
    switch (result.reason) {
      case "not_configured":
        log(
          "[organizer-welcome-email] RESEND_API_KEY is not set; organizer onboarding email was not sent. Set RESEND_API_KEY and RESEND_FROM_EMAIL on Vercel.",
          { eventId, organizerId: user.id, reason: "not_configured" }
        );
        return { outcome: "skipped", reason: "not_configured" };
      case "no_recipient":
        log("[organizer-welcome-email] organizer has no email address; onboarding email was not sent", {
          eventId,
          organizerId: user.id,
          reason: "no_recipient",
        });
        return { outcome: "skipped", reason: "no_recipient" };
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  log("[organizer-welcome-email] failed to send organizer onboarding email", {
    eventId,
    organizerId: user.id,
    reason: result.reason,
    ...(result.detail ? { detail: result.detail } : {}),
  });
  return { outcome: "failed", reason: result.reason };
}
