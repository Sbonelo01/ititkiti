import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

function isMissingFunctionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("function") && normalized.includes("finalize_ticket_purchase");
}

export async function GET() {
  // Paystack signs webhooks with the secret key; either env var is acceptable.
  const webhookSecretConfigured = Boolean(
    process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY
  );

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("finalize_ticket_purchase", {
    p_reference: null,
    p_event_id: null,
    p_ticket_user: {},
    p_ticket_selections: [],
    p_quantity: null,
  });

  const rpcFunctionAvailable = !error || !isMissingFunctionError(error.message || "");
  const healthy = webhookSecretConfigured && rpcFunctionAvailable;

  return NextResponse.json(
    {
      ok: healthy,
      checks: {
        webhookSecretConfigured,
        rpcFunctionAvailable,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
