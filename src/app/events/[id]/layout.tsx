import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { BRAND } from "@/constants/branding";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { lowestTicketPrice } from "@/server/events/publicEvents";

const DEFAULT_EVENT_DESCRIPTION = `Discover events and buy paperless tickets on ${BRAND.name}.`;

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { data: event } = await supabase
      .from("events")
      .select("title, description, poster_url, location, date, price")
      .eq("id", id)
      .maybeSingle();

    if (!event) {
      return buildPageMetadata({
        title: `Event not found`,
        description: `This event is not available on ${BRAND.name}.`,
        path: `/events/${id}`,
      });
    }

    const { data: ticketTypes } = await supabase
      .from("ticket_types")
      .select("price")
      .eq("event_id", id);

    const minPrice = lowestTicketPrice(
      {
        id,
        title: event.title,
        description: event.description ?? "",
        date: event.date,
        location: event.location,
        price: event.price,
        total_tickets: 0,
        organizer_id: "",
      },
      (ticketTypes ?? []).map((row) => ({
        id: "",
        event_id: id,
        name: "",
        price: row.price,
        quantity: 0,
        available_quantity: 0,
      }))
    );

    const description =
      event.description?.trim().slice(0, 200) ||
      `${event.title} — ${event.location}. Get paperless tickets on ${BRAND.name}.`;
    const priceNote =
      minPrice === 0 ? "Free tickets available." : `Tickets from R${minPrice.toFixed(2)}.`;

    return buildPageMetadata({
      title: event.title,
      description: `${description} ${priceNote}`,
      path: `/events/${id}`,
      ogImage: event.poster_url ?? undefined,
    });
  } catch {
    return buildPageMetadata({
      title: "Event",
      description: DEFAULT_EVENT_DESCRIPTION,
      path: `/events/${id}`,
    });
  }
}

export default function EventDetailLayout({ children }: LayoutProps) {
  return children;
}
