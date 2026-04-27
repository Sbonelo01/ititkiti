import { createClient } from "@supabase/supabase-js";

export interface TicketSelection {
  ticketTypeId: string;
  quantity: number;
}

export interface TicketUserPayload {
  email: string;
  name?: string;
  userId?: string;
}

export interface FinalizePurchaseInput {
  reference: string;
  eventId: string;
  ticketSelections?: TicketSelection[];
  quantity?: number;
  ticketUser: TicketUserPayload;
}

type FinalizeResult = {
  success: boolean;
  alreadyProcessed?: boolean;
  createdTickets?: number;
  error?: string;
  status?: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function finalizePurchaseAtomic(input: FinalizePurchaseInput): Promise<FinalizeResult> {
  const isNewFormat = Array.isArray(input.ticketSelections) && input.ticketSelections.length > 0;

  if (!input.reference || !input.eventId || !input.ticketUser?.email) {
    return { success: false, error: "Missing required purchase fields", status: 400 };
  }

  if (!isNewFormat && (!input.quantity || input.quantity < 1)) {
    return { success: false, error: "Missing ticket selections or quantity", status: 400 };
  }

  const { data, error } = await supabase.rpc("finalize_ticket_purchase", {
    p_reference: input.reference,
    p_event_id: input.eventId,
    p_ticket_user: input.ticketUser,
    p_ticket_selections: isNewFormat ? input.ticketSelections : [],
    p_quantity: isNewFormat ? null : input.quantity,
  });

  if (error) {
    const details = String(error.message || "").toLowerCase();
    if (details.includes("not enough tickets")) {
      return { success: false, error: "Not enough tickets available", status: 400 };
    }
    if (details.includes("ticket type") && details.includes("not found")) {
      return { success: false, error: "Ticket type not found", status: 404 };
    }
    if (details.includes("event not found")) {
      return { success: false, error: "Event not found", status: 404 };
    }
    if (details.includes("function finalize_ticket_purchase")) {
      return {
        success: false,
        error: "Atomic purchase function is not deployed. Run the latest SQL migration first.",
        status: 500,
      };
    }
    return { success: false, error: "Failed to finalize purchase", status: 500 };
  }

  const result = (data || {}) as { success?: boolean; alreadyProcessed?: boolean; createdTickets?: number };
  return {
    success: Boolean(result.success),
    alreadyProcessed: Boolean(result.alreadyProcessed),
    createdTickets: result.createdTickets || 0,
  };
}
