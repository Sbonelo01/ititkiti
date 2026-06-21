import type { Metadata } from "next";
import { Roboto, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BRAND } from "@/constants/branding";
import {
  buildPageMetadata,
  DEFAULT_SITE_DESCRIPTION,
  getMetadataBase,
} from "@/lib/seo/metadata";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

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
    icon: "/tikiti-logo.png",
    apple: "/tikiti-logo.png",
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
        <main className="pt-16 md:pt-20 pb-[var(--mobile-nav-offset)] md:pb-8 min-h-screen bg-background">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
