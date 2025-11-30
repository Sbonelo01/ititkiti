import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Tikiti - Your Event Companion",
  description: "Discover, create, and manage events with ease.",
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
    <html lang="en">
      <body
        className={`${roboto.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Navbar />
        {/* Main content with padding for navbars */}
        <main className="pt-16 md:pt-20 pb-24 md:pb-8 min-h-screen bg-background">
          {children}
        </main>
        {/* Modern Footer */}
        <Footer />
      </body>
    </html>
  );
}