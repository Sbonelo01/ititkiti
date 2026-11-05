import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readBoundedJson, REQUEST_LIMITS } from "@/server/http/boundedBody";
import { applyRateLimit } from "@/utils/rateLimit";
import { schedulePurchaseConfirmationEmail } from "@/server/email/purchaseConfirmationEmailDelivery";
import { finalizePurchaseAtomic } from "@/server/payments/finalizePurchase";
import { resolveAndVerifyPurchase } from "@/server/payments/verifyPaystackCharge";

const ticketSelectionSchema = z.object({
  ticketTypeId: z.string().trim().min(1).max(REQUEST_LIMITS.maxTicketTypeIdLength),
  quantity: z.number().int().positive().max(REQUEST_LIMITS.maxTicketQuantity),
});

const purchaseSchema = z.object({
  reference: z.string().trim().min(1).max(REQUEST_LIMITS.maxReferenceLength),
  eventId: z.string().uuid(),
  ticketSelections: z
    .array(ticketSelectionSchema)
    .max(REQUEST_LIMITS.maxTicketSelections)
    .optional(),
  quantity: z.number().int().positive().max(REQUEST_LIMITS.maxTicketQuantity).optional(),
  user: z.object({
    email: z.string().trim().email().max(REQUEST_LIMITS.maxEmailLength),
    name: z.string().trim().max(REQUEST_LIMITS.maxNameLength).optional(),
    userId: z.string().trim().max(REQUEST_LIMITS.maxUserIdLength).optional(),
  }),
});

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, {
    keyPrefix: "purchase-tickets",
    windowMs: 60_000,
    maxRequests: 15,
  });
  if (rateLimited) return rateLimited;

  try {
    const bounded = await readBoundedJson(req, REQUEST_LIMITS.purchaseBytes);
    if (!bounded.ok) return bounded.response;

    const parsed = purchaseSchema.safeParse(bounded.value);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { reference, eventId, ticketSelections, quantity, user } = parsed.data;

    if ((!ticketSelections || ticketSelections.length === 0) && !quantity) {
      return NextResponse.json({ error: "Missing ticket selections or quantity" }, { status: 400 });
    }

    const verified = await resolveAndVerifyPurchase(
      reference,
      eventId,
      ticketSelections,
      quantity,
      user
    );

    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }

    const finalized = await finalizePurchaseAtomic(verified.purchase);

    if (!finalized.success) {
      return NextResponse.json(
        { error: finalized.error || "Failed to finalize purchase" },
        { status: finalized.status || 500 }
      );
    }

    schedulePurchaseConfirmationEmail(verified.purchase.reference);

    return NextResponse.json({
      success: true,
      alreadyProcessed: finalized.alreadyProcessed || false,
      createdTickets: finalized.createdTickets || 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
