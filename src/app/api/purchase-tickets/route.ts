import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { finalizePurchaseAtomic } from "@/server/payments/finalizePurchase";

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "purchase-tickets",
    windowMs: 60_000,
    maxRequests: 15,
  });
  if (rateLimited) return rateLimited;

  try {
    const { reference, eventId, ticketSelections, quantity, user: ticketUser } = await req.json();
    
    // Support both new format (ticketSelections) and old format (quantity) for backward compatibility
    // Synthetic "default" from the client is not a real ticket_types id (invalid UUID) — use legacy path.
    let normalizedSelections = ticketSelections;
    let normalizedQuantity = quantity;
    if (Array.isArray(ticketSelections) && ticketSelections.length > 0) {
      const onlyDefault = ticketSelections.every(
        (s: { ticketTypeId?: string }) => s?.ticketTypeId === "default"
      );
      if (onlyDefault) {
        const sum = ticketSelections.reduce(
          (acc: number, s: { quantity?: number }) => acc + (Number(s?.quantity) || 0),
          0
        );
        normalizedSelections = undefined;
        normalizedQuantity = sum;
      }
    }

    const isNewFormat = normalizedSelections && Array.isArray(normalizedSelections) && normalizedSelections.length > 0;
    
    if (!reference || !eventId || !ticketUser) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isNewFormat && !normalizedQuantity) {
      return NextResponse.json({ error: "Missing ticket selections or quantity" }, { status: 400 });
    }

    // 1. Verify payment with Paystack
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data.status !== "success") {
      return NextResponse.json({ error: "Payment verification failed", details: verifyData }, { status: 400 });
    }

    const finalized = await finalizePurchaseAtomic({
      reference,
      eventId,
      ticketSelections: isNewFormat ? normalizedSelections : undefined,
      quantity: !isNewFormat ? normalizedQuantity : undefined,
      ticketUser: {
        email: ticketUser.email,
        name: ticketUser.name,
        userId: ticketUser.userId,
      },
    });

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
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
} 