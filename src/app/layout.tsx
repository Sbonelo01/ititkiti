import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Tikiti - Your Event Companion",
  description: "Discover, create, and manage events with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={"antialiased bg-background text-foreground font-sans"}
      >
        <Navbar />
        {/* Main content with padding for navbars */}
        <main className="md:pt-20 pb-24 md:pb-8 min-h-screen bg-background">
          {children}
        </main>
        {/* Footer (above mobile nav, below content on desktop) */}
        <footer className="w-full bg-white text-text-faded text-center py-6 text-sm shadow-lg z-40 md:fixed md:bottom-0 md:left-0 md:py-4 md:text-xs mb-16 md:mb-0">
          &copy; {new Date().getFullYear()} Tikiti. All rights reserved.
          <p>Funzilla</p>
        </footer>
      </body>
    </html>
  );
}