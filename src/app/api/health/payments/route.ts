import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

function isMissingFunctionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("function") && normalized.includes("finalize_ticket_purchase");
}

export async function GET() {
  const paymentsConfigured = Boolean(
    process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY
  );

  let ticketIssuanceAvailable = false;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc("finalize_ticket_purchase", {
      p_reference: null,
      p_event_id: null,
      p_ticket_user: {},
      p_ticket_selections: [],
      p_quantity: null,
    });
    ticketIssuanceAvailable = !error || !isMissingFunctionError(error.message || "");
  } catch {
    ticketIssuanceAvailable = false;
  }

  const healthy = paymentsConfigured && ticketIssuanceAvailable;

  return NextResponse.json(
    {
      ok: healthy,
      checks: {
        paymentsConfigured,
        ticketIssuanceAvailable,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
