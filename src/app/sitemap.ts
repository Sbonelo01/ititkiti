import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/metadata";
import { fetchPublicEventSitemapEntries } from "@/server/events/publicEvents";

export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] =
  [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/events", priority: 0.9, changeFrequency: "daily" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/help", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: path ? absoluteUrl(path) : absoluteUrl("/"),
    lastModified: now,
    changeFrequency,
    priority,
  }));

  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const events = await fetchPublicEventSitemapEntries();
    eventEntries = events.map((event) => ({
      url: absoluteUrl(`/events/${event.id}`),
      lastModified: new Date(event.created_at ?? event.date ?? now),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch {
    // Build may run without Supabase credentials; static routes still publish.
  }

  return [...staticEntries, ...eventEntries];
}
