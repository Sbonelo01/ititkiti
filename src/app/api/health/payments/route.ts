import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isMissingFunctionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("function") && normalized.includes("finalize_ticket_purchase");
}

export async function GET() {
  const webhookSecretConfigured = Boolean(
    process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY
  );

  // Non-destructive RPC probe: deliberately invalid args should fail with
  // a business validation error when function exists, or missing function error otherwise.
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
      details: {
        rpcProbeError: error?.message || null,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
