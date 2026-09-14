import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit } from "@/utils/rateLimit";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { sendOrganizerWelcomeEmail } from "@/server/email/sendOrganizerWelcomeEmail";

const bodySchema = z.object({
  eventId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "organizer-welcome-email",
    windowMs: 60_000,
    maxRequests: 8,
  });
  if (rateLimited) return rateLimited;

  const auth = await requireOrganizerAuth(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: event, error } = await supabase
      .from("events")
      .select("id, title, organizer_id")
      .eq("id", parsed.data.eventId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
    }
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizer_id !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await sendOrganizerWelcomeEmail({
      to: auth.user.email ?? "",
      eventTitle: event.title,
      eventId: event.id,
      organizerName:
        (auth.user.user_metadata?.name as string | undefined) ||
        (auth.user.user_metadata?.company_name as string | undefined),
    });

    if (result.ok) {
      return NextResponse.json({ success: true, sent: true });
    }
    if (result.skipped) {
      return NextResponse.json({ success: true, sent: false, reason: result.reason });
    }
    return NextResponse.json({ success: true, sent: false, reason: result.reason });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
