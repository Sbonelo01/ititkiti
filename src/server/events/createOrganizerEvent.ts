import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  deliverOrganizerWelcomeEmail,
  type DeliverOrganizerWelcomeEmailResult,
} from "@/server/email/organizerWelcomeEmailDelivery";

export type CreateOrganizerTicketType = {
  name: string;
  price: number;
  quantity: number;
  description: string | null;
};

export type CreateOrganizerEventInput = {
  title: string;
  description: string;
  date: string;
  location: string;
  posterUrl: string;
  ticketTypes: CreateOrganizerTicketType[];
};

export type CreateOrganizerEventResult =
  | {
      ok: true;
      event: { id: string; title: string };
      welcomeEmail: { sent: boolean; reason?: string };
    }
  | { ok: false; status: number; error: string };

function welcomeEmailStatus(
  result: DeliverOrganizerWelcomeEmailResult
): { sent: boolean; reason?: string } {
  switch (result.outcome) {
    case "sent":
      return { sent: true };
    case "skipped":
    case "failed":
      return { sent: false, reason: result.reason };
    case "not_found":
      return { sent: false, reason: "not_found" };
    case "forbidden":
      return { sent: false, reason: "forbidden" };
    case "error":
      return { sent: false, reason: "event_lookup_failed" };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

export async function createOrganizerEvent(
  user: User,
  input: CreateOrganizerEventInput
): Promise<CreateOrganizerEventResult> {
  if (input.ticketTypes.length === 0) {
    return { ok: false, status: 400, error: "Add at least one ticket type" };
  }

  const supabase = getSupabaseAdmin();
  const totalTickets = input.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const basePrice = Math.min(...input.ticketTypes.map((ticket) => ticket.price));

  const { data: event, error: insertError } = await supabase
    .from("events")
    .insert({
      title: input.title,
      description: input.description,
      date: new Date(input.date).toISOString(),
      location: input.location,
      price: basePrice,
      total_tickets: totalTickets,
      organizer_id: user.id,
      poster_url: input.posterUrl,
    })
    .select("id, title")
    .single();

  if (insertError || !event) {
    console.error("[create-event] event insert failed", {
      organizerId: user.id,
      message: insertError?.message ?? "no row",
    });
    return { ok: false, status: 500, error: "Failed to create event" };
  }

  const ticketRows = input.ticketTypes.map((ticket) => ({
    event_id: event.id,
    name: ticket.name,
    price: ticket.price,
    quantity: ticket.quantity,
    available_quantity: ticket.quantity,
    description: ticket.description,
  }));

  const { error: ticketError } = await supabase.from("ticket_types").insert(ticketRows);
  if (ticketError) {
    console.error("[create-event] ticket type insert failed", {
      eventId: event.id,
      organizerId: user.id,
      message: ticketError.message,
    });
    const { error: rollbackError } = await supabase.from("events").delete().eq("id", event.id);
    if (rollbackError) {
      console.error("[create-event] failed to roll back event after ticket insert error", {
        eventId: event.id,
        message: rollbackError.message,
      });
    }
    return { ok: false, status: 500, error: "Failed to create ticket types" };
  }

  let welcomeEmail: { sent: boolean; reason?: string } = {
    sent: false,
    reason: "internal_error",
  };
  try {
    const delivered = await deliverOrganizerWelcomeEmail({ eventId: event.id, user });
    welcomeEmail = welcomeEmailStatus(delivered);
  } catch (err) {
    console.error("[organizer-welcome-email] unexpected error after event create", {
      eventId: event.id,
      organizerId: user.id,
      message: err instanceof Error ? err.message : "unknown",
    });
  }

  return {
    ok: true,
    event: { id: event.id, title: event.title },
    welcomeEmail,
  };
}
