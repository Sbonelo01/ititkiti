import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { declaredBodyTooLarge, readBoundedJson, REQUEST_LIMITS } from "@/server/http/boundedBody";
import { applyRateLimit } from "@/utils/rateLimit";
import { requireOrganizerAuth } from "@/server/auth/sessionAuth";
import { generateOrganizerInvoice } from "@/server/invoices/generateOrganizerInvoice";

const bodySchema = z.object({
  eventId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "invoices-generate",
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (rateLimited) return rateLimited;

  const oversized = declaredBodyTooLarge(req, REQUEST_LIMITS.smallJsonBytes);
  if (oversized) return oversized;

  const auth = await requireOrganizerAuth(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const bounded = await readBoundedJson(req, REQUEST_LIMITS.smallJsonBytes);
    if (!bounded.ok) return bounded.response;
    const parsed = bodySchema.safeParse(bounded.value);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await generateOrganizerInvoice(auth.user, parsed.data.eventId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, invoice: result.invoice });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
