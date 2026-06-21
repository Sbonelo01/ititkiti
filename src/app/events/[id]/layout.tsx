import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { getEventShareUrl } from "@/utils/eventShare";
import { BRAND } from "@/constants/branding";

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
      return { title: `Event not found | ${BRAND.name}` };
    }

    const url = getEventShareUrl(id);
    const description =
      event.description?.trim().slice(0, 200) ||
      `${event.title} — ${event.location}. Get paperless tickets on ${BRAND.name}.`;
    const priceNote =
      Number(event.price) === 0 ? "Free tickets" : `From R${Number(event.price).toFixed(2)}`;

    return {
      title: `${event.title} | ${BRAND.name}`,
      description: `${description} ${priceNote}.`,
      openGraph: {
        title: event.title,
        description,
        url,
        siteName: BRAND.name,
        locale: "en_ZA",
        type: "website",
        ...(event.poster_url
          ? {
              images: [
                {
                  url: event.poster_url,
                  alt: `${event.title} poster`,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: event.poster_url ? "summary_large_image" : "summary",
        title: event.title,
        description,
        ...(event.poster_url ? { images: [event.poster_url] } : {}),
      },
    };
  } catch {
    return { title: `Event | ${BRAND.name}` };
  }
}

export default function EventDetailLayout({ children }: LayoutProps) {
  return children;
}
