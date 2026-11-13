import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { declaredBodyTooLarge, readBoundedJson, REQUEST_LIMITS } from "@/server/http/boundedBody";
import { normalizeScannerEmail } from "@/server/auth/scannerAuth";
import { requireEventOrganizer } from "@/server/events/eventOrganizerAuth";
import {
  scannerMemberStatus,
  type ScannerMemberStatus,
} from "@/lib/scanner/scannerMemberStatus";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { applyRateLimit } from "@/utils/rateLimit";

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});

const eventIdSchema = z.uuid();

const INVITE_ACCEPTED = { ok: true } as const;

type RouteContext = { params: Promise<{ eventId: string }> };

type MemberRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  invited_email: string;
  invited_by: string;
  created_at: string;
  revoked_at: string | null;
};

function withStatus(row: MemberRow): MemberRow & { status: ScannerMemberStatus } {
  return {
    ...row,
    status: scannerMemberStatus({
      user_id: row.user_id,
      revoked_at: row.revoked_at,
    }),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const rateLimited = await applyRateLimit(req, {
    keyPrefix: "scanner-invite-list",
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (rateLimited) return rateLimited;

  const { eventId } = await context.params;
  if (!eventIdSchema.safeParse(eventId).success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const auth = await requireEventOrganizer(req.headers.get("authorization"), eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_scanner_members")
    .select("id, event_id, user_id, invited_email, invited_by, created_at, revoked_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load door team" }, { status: 500 });
  }

  const members = ((data ?? []) as MemberRow[]).map(withStatus);
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const rateLimited = await applyRateLimit(req, {
    keyPrefix: "scanner-invite",
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (rateLimited) return rateLimited;

  const oversized = declaredBodyTooLarge(req, REQUEST_LIMITS.smallJsonBytes);
  if (oversized) return oversized;

  const { eventId } = await context.params;
  if (!eventIdSchema.safeParse(eventId).success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const auth = await requireEventOrganizer(req.headers.get("authorization"), eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const bounded = await readBoundedJson(req, REQUEST_LIMITS.smallJsonBytes, "Invalid JSON body");
  if (!bounded.ok) return bounded.response;

  const body = (bounded.value ?? {}) as { email?: unknown };
  const rawEmail = typeof body.email === "string" ? normalizeScannerEmail(body.email) : body.email;
  const parsed = inviteSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("event_scanner_members").insert({
    event_id: eventId,
    user_id: null,
    invited_email: parsed.data.email,
    invited_by: auth.user.id,
  });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Failed to add scanner access" }, { status: 500 });
  }

  return NextResponse.json(INVITE_ACCEPTED);
}
