import { NextRequest, NextResponse } from "next/server";
import { declaredBodyTooLarge, readBoundedJson, REQUEST_LIMITS } from "@/server/http/boundedBody";
import { normalizeScannerEmail } from "@/server/auth/scannerAuth";
import { requireEventOrganizer } from "@/server/events/eventOrganizerAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { applyRateLimit } from "@/utils/rateLimit";

const INVITE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INVITE_ACCEPTED = { ok: true } as const;

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const rateLimited = await applyRateLimit(req, {
    keyPrefix: "scanner-invite-list",
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (rateLimited) return rateLimited;

  const { eventId } = await context.params;
  const auth = await requireEventOrganizer(req.headers.get("authorization"), eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_scanner_members")
    .select("id, event_id, user_id, invited_email, invited_by, created_at, revoked_at")
    .eq("event_id", eventId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load door team" }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
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
  const auth = await requireEventOrganizer(req.headers.get("authorization"), eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const bounded = await readBoundedJson(req, REQUEST_LIMITS.smallJsonBytes, "Invalid JSON body");
  if (!bounded.ok) return bounded.response;
  const body = (bounded.value ?? {}) as { email?: string };

  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const invitedEmail = rawEmail ? normalizeScannerEmail(rawEmail) : "";
  if (!invitedEmail || invitedEmail.length > 320 || !INVITE_EMAIL.test(invitedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("event_scanner_members").insert({
    event_id: eventId,
    user_id: null,
    invited_email: invitedEmail,
    invited_by: auth.user.id,
  });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Failed to add scanner access" }, { status: 500 });
  }

  return NextResponse.json(INVITE_ACCEPTED);
}
