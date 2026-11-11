import type { Metadata } from "next";
import "./globals.css";
import { plusJakarta, roboto } from "@/fonts/appFonts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthPendingRedirect } from "@/components/AuthPendingRedirect";
import { BRAND } from "@/constants/branding";
import {
  buildPageMetadata,
  DEFAULT_SITE_DESCRIPTION,
  getMetadataBase,
} from "@/lib/seo/metadata";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  ...buildPageMetadata({
    title: `${BRAND.name} — Paperless Event Ticketing`,
    description: DEFAULT_SITE_DESCRIPTION,
  }),
  title: {
    default: `${BRAND.name} — Paperless Event Ticketing`,
    template: `%s | ${BRAND.name}`,
  },
  keywords: [
    "event tickets",
    "paperless ticketing",
    "South Africa events",
    "QR tickets",
    "Durban events",
    "sell tickets online",
    "Tikiti",
  ],
  authors: [{ name: "IZIBONELO TECH PTY LTD", url: "https://www.tikiti.fun" }],
  creator: BRAND.name,
  publisher: "IZIBONELO TECH PTY LTD",
  category: "technology",
  icons: {
    icon: "/favicon.svg",
    apple: "/tikiti-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA">
      <body
        className={`${roboto.variable} ${plusJakarta.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Navbar />
        <AuthPendingRedirect />
        <main className="pt-16 md:pt-20 pb-[var(--mobile-nav-offset)] md:pb-8 min-h-screen bg-background">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
