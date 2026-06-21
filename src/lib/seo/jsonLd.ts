import { BRAND } from "@/constants/branding";
import { absoluteUrl } from "@/lib/seo/metadata";

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    legalName: "IZIBONELO TECH PTY LTD",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/tikiti-logo.png"),
    description: BRAND.ecoDescription,
    email: "info@tikiti.fun",
    telephone: "+27-61-069-2364",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Durban",
      addressCountry: "ZA",
    },
    sameAs: ["https://www.tiktok.com/@tikiti.fun"],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: absoluteUrl("/"),
    description: BRAND.tagline,
    inLanguage: "en-ZA",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/events")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export type EventJsonLdInput = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  posterUrl?: string | null;
  lowestPrice?: number;
};

export function buildEventJsonLd(event: EventJsonLdInput) {
  const ticketPrice = event.lowestPrice ?? event.price;
  const offers =
    ticketPrice >= 0
      ? {
          "@type": "Offer",
          url: absoluteUrl(`/events/${event.id}`),
          price: ticketPrice.toFixed(2),
          priceCurrency: "ZAR",
          availability: "https://schema.org/InStock",
          validFrom: new Date().toISOString(),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.date,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.location,
        addressCountry: "ZA",
      },
    },
    image: event.posterUrl ? [event.posterUrl] : [absoluteUrl("/tikiti-logo.png")],
    organizer: {
      "@type": "Organization",
      name: BRAND.name,
      url: absoluteUrl("/"),
    },
    ...(offers ? { offers } : {}),
  };
}

export type FaqItem = { question: string; answer: string };

export function buildFaqPageJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
