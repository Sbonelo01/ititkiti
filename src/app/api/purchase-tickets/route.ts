import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyRateLimit } from "@/utils/rateLimit";
import { finalizePurchaseAtomic } from "@/server/payments/finalizePurchase";
import { resolveAndVerifyPurchase } from "@/server/payments/verifyPaystackCharge";

const purchaseSchema = z.object({
  reference: z.string().min(1),
  eventId: z.string().uuid(),
  ticketSelections: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
  quantity: z.number().int().positive().optional(),
  user: z.object({
    email: z.string().email(),
    name: z.string().optional(),
    userId: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "purchase-tickets",
    windowMs: 60_000,
    maxRequests: 15,
  });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);
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
        {
          error: finalized.error || "Failed to finalize purchase",
          details: finalized.pgMessage,
        },
        { status: finalized.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: finalized.alreadyProcessed || false,
      createdTickets: finalized.createdTickets || 0,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
