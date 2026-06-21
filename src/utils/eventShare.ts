import { BRAND } from "@/constants/branding";

export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function getEventSharePath(eventId: string): string {
  return `/events/${eventId}`;
}

export function getEventShareUrl(eventId: string): string {
  return `${getSiteOrigin()}${getEventSharePath(eventId)}`;
}

export type EventShareInput = {
  eventId: string;
  title: string;
  dateLabel?: string;
  location?: string;
  priceLabel?: string;
};

export function buildEventShareMessage({
  title,
  dateLabel,
  location,
  priceLabel,
  eventId,
}: EventShareInput): string {
  const url = getEventShareUrl(eventId);
  const parts = [`Get tickets for ${title} on ${BRAND.name}`];
  if (dateLabel) parts.push(dateLabel);
  if (location) parts.push(location);
  if (priceLabel) parts.push(priceLabel);
  parts.push(url);
  return parts.join(" · ");
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildXShareUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function buildLinkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/** Opens TikTok upload; copies share text first (no official web sharer for external URLs). */
export function buildTikTokShareUrl(): string {
  return "https://www.tiktok.com/upload";
}

export function buildEmailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
