import { User } from "@supabase/supabase-js";
import { canScanEvent } from "@/server/auth/scannerAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";

export type TicketValidationStatus =
  | "valid"
  | "already_used"
  | "not_found"
  | "error"
  | "unauthorized";

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
  | { success: false; status: "error"; error: string }
  | { success: false; status: "unauthorized"; error: string };

async function lookupPaidTicket(qrCodeData: string): Promise<ValidatedTicket | null> {
  const supabase = getSupabaseAdmin();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, attendee_name, email, used, event_id, created_at")
    .eq("qr_code_data", qrCodeData)
    .eq("payment_status", "paid")
    .single();

  if (error || !ticket) {
    return null;
  }

  return ticket;
}

export async function validateAndMarkTicketUsed(qrCodeData: string): Promise<ValidateTicketResult> {
  return validateAndMarkTicketUsedForScanner(qrCodeData, null);
}

export async function validateAndMarkTicketUsedForScanner(
  qrCodeData: string,
  scannerUser: User | null
): Promise<ValidateTicketResult> {
  if (!qrCodeData?.trim()) {
    return { success: false, status: "error", error: "Missing QR code data" };
  }

  const ticket = await lookupPaidTicket(qrCodeData);

  if (!ticket) {
    return {
      success: false,
      status: "not_found",
      error: "Ticket not found or invalid",
    };
  }

  if (scannerUser) {
    const allowed = await canScanEvent(scannerUser, ticket.event_id);
    if (!allowed) {
      return {
        success: false,
        status: "unauthorized",
        error: "Not authorized to scan tickets for this event",
      };
    }
  }

  if (ticket.used) {
    return {
      success: false,
      status: "already_used",
      error: "Ticket has already been used",
      ticket,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: updated, error: updateError } = await supabase
    .from("tickets")
    .update({ used: true })
    .eq("id", ticket.id)
    .eq("used", false)
    .select("id, attendee_name, email, used, event_id, created_at")
    .maybeSingle();

  if (updateError) {
    return { success: false, status: "error", error: "Failed to mark ticket as used" };
  }

  if (!updated) {
    return {
      success: false,
      status: "already_used",
      error: "Ticket has already been used",
      ticket: { ...ticket, used: true },
    };
  }

  return {
    success: true,
    status: "valid",
    ticket: updated,
  };
}
