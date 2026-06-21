import HomePageClient from "@/components/HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo/jsonLd";
import { BRAND } from "@/constants/branding";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { fetchPublicEventsList, normalizePublicEventsForClient } from "@/server/events/publicEvents";

export const metadata = buildPageMetadata({
  title: `${BRAND.name} — Paperless Event Ticketing in South Africa`,
  description:
    "Discover events, buy digital QR tickets, and sell paperless tickets in South Africa. Secure Paystack checkout and a free scanner app for organizers.",
  path: "/",
});

export default async function HomePage() {
  let initialEvents: ReturnType<typeof normalizePublicEventsForClient> = [];
  try {
    initialEvents = normalizePublicEventsForClient(await fetchPublicEventsList());
  } catch {
    // Client will fetch when server credentials are unavailable locally.
  }

  return (
    <>
      <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
      <HomePageClient initialEvents={initialEvents} />
    </>
  );
}
