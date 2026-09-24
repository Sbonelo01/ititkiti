import { NextRequest, NextResponse } from "next/server";
import { normalizeScannerEmail } from "@/server/auth/scannerAuth";
import {
  findAuthUserIdByEmail,
  requireEventOrganizer,
} from "@/server/events/eventOrganizerAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
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
  const { eventId } = await context.params;
  const auth = await requireEventOrganizer(req.headers.get("authorization"), eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawEmail = body.email?.trim();
  if (!rawEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const invitedEmail = normalizeScannerEmail(rawEmail);
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("event_scanner_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("invited_email", invitedEmail)
    .is("revoked_at", null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "This email already has scanner access for this event" }, { status: 409 });
  }

  const userId = await findAuthUserIdByEmail(invitedEmail);

  const { data: member, error } = await supabase
    .from("event_scanner_members")
    .insert({
      event_id: eventId,
      user_id: userId,
      invited_email: invitedEmail,
      invited_by: auth.user.id,
    })
    .select("id, event_id, user_id, invited_email, invited_by, created_at, revoked_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to add scanner access" }, { status: 500 });
  }

  return NextResponse.json({ member }, { status: 201 });
}
