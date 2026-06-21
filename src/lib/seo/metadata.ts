import type { Metadata } from "next";
import { BRAND } from "@/constants/branding";
import { getSiteOrigin } from "@/utils/eventShare";

export const DEFAULT_SITE_DESCRIPTION =
  "Green, innovative, paperless ticketing for South Africa. Digital QR tickets, secure Paystack payments, and a free scanner app for event organizers.";

export function getMetadataBase(): URL {
  return new URL(getSiteOrigin());
}

export function absoluteUrl(path: string): string {
  const base = getSiteOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function defaultOgImages(): NonNullable<Metadata["openGraph"]>["images"] {
  return [
    {
      url: absoluteUrl("/tikiti-logo.png"),
      width: 512,
      height: 512,
      alt: `${BRAND.name} — ${BRAND.tagline}`,
    },
  ];
}

type PageMetadataOptions = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string | null;
};

function toAbsoluteImageUrl(img: unknown): string {
  if (typeof img === "string") return img;
  if (img instanceof URL) return img.toString();
  if (img && typeof img === "object" && "url" in img) {
    const url = (img as { url: string | URL }).url;
    return typeof url === "string" ? url : url.toString();
  }
  return "";
}

export function buildPageMetadata({
  title,
  description = DEFAULT_SITE_DESCRIPTION,
  path,
  noIndex = false,
  ogImage,
}: PageMetadataOptions): Metadata {
  const url = path ? absoluteUrl(path) : getSiteOrigin();
  const images =
    ogImage === null
      ? undefined
      : ogImage
        ? [{ url: ogImage.startsWith("http") ? ogImage : absoluteUrl(ogImage), alt: title }]
        : defaultOgImages();

  const imageList = images ? (Array.isArray(images) ? images : [images]) : [];

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND.name,
      locale: "en_ZA",
      type: "website",
      ...(imageList.length > 0 ? { images: imageList } : {}),
    },
    twitter: {
      card: imageList.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageList.length > 0
        ? {
            images: imageList.map((img) => toAbsoluteImageUrl(img)),
          }
        : {}),
    },
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
};
