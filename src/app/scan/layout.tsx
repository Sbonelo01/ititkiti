import type { Metadata, Viewport } from "next";
import { NOINDEX_METADATA } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Scan tickets",
  description: "Staff door scanner for Tikiti tickets.",
  manifest: "/scan.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Tikiti Scan",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
