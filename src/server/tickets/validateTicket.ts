import { getSupabaseAdmin } from "@/server/supabaseAdmin";

export type TicketValidationStatus = "valid" | "already_used" | "not_found" | "error";

export interface ValidatedTicket {
  id: string;
  attendee_name: string;
  email: string;
  used: boolean;
  event_id: string;
  created_at: string;
}

export type ValidateTicketResult =
  | { success: true; status: "valid"; ticket: ValidatedTicket }
  | { success: false; status: "already_used"; error: string; ticket: ValidatedTicket }
  | { success: false; status: "not_found"; error: string }
  | { success: false; status: "error"; error: string };

export async function validateAndMarkTicketUsed(qrCodeData: string): Promise<ValidateTicketResult> {
  if (!qrCodeData?.trim()) {
    return { success: false, status: "error", error: "Missing QR code data" };
  }

  const supabase = getSupabaseAdmin();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, attendee_name, email, used, event_id, created_at")
    .eq("qr_code_data", qrCodeData)
    .eq("payment_status", "paid")
    .single();

  if (error || !ticket) {
    return {
      success: false,
      status: "not_found",
      error: "Ticket not found or invalid",
    };
  }

  if (ticket.used) {
    return {
      success: false,
      status: "already_used",
      error: "Ticket has already been used",
      ticket,
    };
  }

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ used: true })
    .eq("id", ticket.id);

  if (updateError) {
    return { success: false, status: "error", error: "Failed to mark ticket as used" };
  }

  return {
    success: true,
    status: "valid",
    ticket: { ...ticket, used: true },
  };
}
