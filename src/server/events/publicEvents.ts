import { getSupabaseAdmin } from "@/server/supabaseAdmin";

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  total_tickets: number;
  organizer_id: string;
  poster_url?: string | null;
  created_at?: string;
};

export type PublicTicketType = {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  available_quantity: number;
  description?: string | null;
};

export type PublicEventSitemapEntry = {
  id: string;
  date: string;
  created_at?: string;
};

export async function fetchPublicEventsList(): Promise<PublicEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicEvent[];
}

export async function fetchPublicEventById(
  eventId: string
): Promise<{ event: PublicEvent; ticketTypes: PublicTicketType[] } | null> {
  const supabase = getSupabaseAdmin();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return null;
  }

  const { data: ticketTypes, error: typesError } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("price", { ascending: true });

  if (typesError) {
    throw new Error(typesError.message);
  }

  return {
    event: event as PublicEvent,
    ticketTypes: (ticketTypes ?? []) as PublicTicketType[],
  };
}

export async function fetchPublicEventSitemapEntries(): Promise<PublicEventSitemapEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("events").select("id, date, created_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicEventSitemapEntry[];
}

export function normalizePublicEventForClient(event: PublicEvent) {
  return {
    ...event,
    poster_url: event.poster_url ?? undefined,
  };
}

export function normalizePublicEventsForClient(events: PublicEvent[]) {
  return events.map(normalizePublicEventForClient);
}

export function lowestTicketPrice(event: PublicEvent, ticketTypes: PublicTicketType[]): number {
  if (ticketTypes.length > 0) {
    return Math.min(...ticketTypes.map((t) => Number(t.price) || 0));
  }
  return Number(event.price) || 0;
}

