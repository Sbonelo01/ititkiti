import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { FaHome, FaCalendarAlt, FaSignInAlt } from "react-icons/fa";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        {/* Desktop Navbar (fixed top) */}
        <nav className="hidden md:flex fixed top-0 left-0 w-full h-16 bg-white shadow z-50 items-center justify-between px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">Tikiti</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Home</Link>
            <Link href="/events" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Events</Link>
            <Link href="/login" className="bg-blue-600 text-white px-5 py-2 rounded-full font-semibold shadow hover:bg-blue-700 transition-colors">Sign In</Link>
          </div>
        </nav>
        {/* Main content with padding for navbars */}
        <main className="md:pt-16 pb-24 md:pb-8 min-h-screen bg-[var(--background)]">
          {children}
        </main>
        {/* Footer (above mobile nav, below content on desktop) */}
        <footer className="w-full bg-gray-100 text-gray-500 text-center py-4 text-sm border-t border-gray-200 z-40 md:fixed md:bottom-0 md:left-0 md:bg-white md:py-2 md:text-xs mb-16 md:mb-0">
          &copy; {new Date().getFullYear()} Tikiti. All rights reserved.
        </footer>
        {/* Mobile Navbar (fixed bottom) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-white shadow-t z-50 flex items-center justify-around border-t border-gray-200">
          <Link href="/" className="flex flex-col items-center text-gray-700 hover:text-blue-600 transition-colors">
            <FaHome className="h-6 w-6 mb-1" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/events" className="flex flex-col items-center text-gray-700 hover:text-blue-600 transition-colors">
            <FaCalendarAlt className="h-6 w-6 mb-1" />
            <span className="text-xs">Events</span>
          </Link>
          <Link href="/login" className="flex flex-col items-center text-gray-700 hover:text-blue-600 transition-colors">
            <FaSignInAlt className="h-6 w-6 mb-1" />
            <span className="text-xs">Sign In</span>
          </Link>
        </nav>
      </body>
    </html>
  );
}
