import HomePageClient from "@/components/HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo/jsonLd";
import { BRAND } from "@/constants/branding";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { fetchPublicEventsList, normalizePublicEventsForClient } from "@/server/events/publicEvents";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: `${BRAND.name} — You keep 100% of the ticket price`,
  description:
    "List events free on Tikiti. Organizers keep 100% of ticket face value. Buyers pay the platform fee at checkout and get QR tickets. Scan at the door in the browser.",
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
