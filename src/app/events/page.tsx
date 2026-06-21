import EventsPageClient from "@/components/EventsPageClient";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/constants/branding";
import { fetchPublicEventsList, normalizePublicEventsForClient } from "@/server/events/publicEvents";

export const metadata = buildPageMetadata({
  title: `Browse Events | ${BRAND.name}`,
  description:
    "Find concerts, festivals, sports, and community events in South Africa. Buy paperless QR tickets online with secure checkout.",
  path: "/events",
});

export default async function EventsPage() {
  let initialEvents: ReturnType<typeof normalizePublicEventsForClient> = [];
  try {
    initialEvents = normalizePublicEventsForClient(await fetchPublicEventsList());
  } catch {
    // Client fallback fetch.
  }

  return <EventsPageClient initialEvents={initialEvents} />;
}
