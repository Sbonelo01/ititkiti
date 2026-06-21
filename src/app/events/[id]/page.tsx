import { notFound } from "next/navigation";
import EventDetailClient from "@/components/EventDetailClient";
import JsonLd from "@/components/seo/JsonLd";
import { buildEventJsonLd } from "@/lib/seo/jsonLd";
import {
  fetchPublicEventById,
  lowestTicketPrice,
  normalizePublicEventForClient,
} from "@/server/events/publicEvents";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await fetchPublicEventById(id).catch(() => null);

  if (!result) {
    notFound();
  }

  const { event: rawEvent, ticketTypes } = result;
  const event = normalizePublicEventForClient(rawEvent);
  const minPrice = lowestTicketPrice(rawEvent, ticketTypes);

  return (
    <>
      <JsonLd
        data={buildEventJsonLd({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location,
          price: event.price,
          posterUrl: event.poster_url,
          lowestPrice: minPrice,
        })}
      />
      <EventDetailClient
        eventId={id}
        initialEvent={event}
        initialTicketTypes={ticketTypes.map((tt) => ({
          ...tt,
          description: tt.description ?? undefined,
        }))}
      />
    </>
  );
}
