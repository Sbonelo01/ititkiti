import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit } from "@/utils/rateLimit";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import {
  deliverOrganizerWelcomeEmail,
  type DeliverOrganizerWelcomeEmailResult,
} from "@/server/email/organizerWelcomeEmailDelivery";

const bodySchema = z.object({
  eventId: z.string().uuid(),
});

function toResponse(result: DeliverOrganizerWelcomeEmailResult): NextResponse {
  switch (result.outcome) {
    case "sent":
      return NextResponse.json({ success: true, sent: true });
    case "skipped":
    case "failed":
      return NextResponse.json({ success: true, sent: false, reason: result.reason });
    case "not_found":
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    case "forbidden":
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    case "error":
      return NextResponse.json({ error: result.error }, { status: result.status });
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

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

    const result = await deliverOrganizerWelcomeEmail({
      eventId: parsed.data.eventId,
      user: auth.user,
    });
    return toResponse(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
