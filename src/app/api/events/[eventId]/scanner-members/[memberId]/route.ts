import { NextRequest, NextResponse } from "next/server";
import { requireEventOrganizer } from "@/server/events/eventOrganizerAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

type RouteContext = { params: Promise<{ eventId: string; memberId: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { eventId, memberId } = await context.params;
  const auth = await requireEventOrganizer(req.headers.get("authorization"), eventId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { data: member, error: fetchError } = await supabase
    .from("event_scanner_members")
    .select("id, event_id, revoked_at")
    .eq("id", memberId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (fetchError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.revoked_at) {
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("event_scanner_members")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("event_id", eventId);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
