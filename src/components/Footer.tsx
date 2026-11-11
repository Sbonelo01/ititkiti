"use client";
import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { SCANNER_APP_URL } from "@/constants/branding";
import { POWERED_BY_LINE, SELL_PATH } from "@/constants/landing";
import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubscribeMessage(null);
    setSubscribeError(null);

    if (!email.trim()) {
      setSubscribeError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("https://formspree.io/f/mrgvvqel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        setSubscribeError("Subscription failed. Please try again.");
        return;
      }

      setSubscribeMessage("Thank you for subscribing!");
      setEmail("");
    } catch {
      setSubscribeError("Unable to subscribe right now. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pathname === "/scan") return null;

  return (
    <footer className="bg-[#0B1510] pb-[var(--mobile-nav-offset)] text-gray-200 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex" aria-label="Tikiti home">
            <Image
              src="/tikiti-wordmark.png"
              alt="tikiti."
              width={110}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-gray-300">
            Paperless event ticketing in South Africa. Organizers keep 100% of ticket face value.
            Buyers pay a small platform fee at checkout.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-300">
            IZIBONELO TECH PTY LTD
            <br />
            Durban, South Africa
            <br />
            <a className="font-semibold text-green-50 hover:underline" href="tel:+27610692364">
              +27 61 069 2364
            </a>
            <br />
            <a className="font-semibold text-green-50 hover:underline" href="mailto:info@tikiti.fun">
              info@tikiti.fun
            </a>
          </p>
          <div className="mt-4 flex items-center gap-3">
            <a href="https://www.facebook.com/tiikiitii" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-lg bg-white/10 p-2 hover:bg-green-700">
              <FaFacebook className="h-5 w-5" />
            </a>
            <a href="https://www.instagram.com/tikiti_fun" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-lg bg-white/10 p-2 hover:bg-green-700">
              <FaInstagram className="h-5 w-5" />
            </a>
            <a href="https://www.tiktok.com/@tikiti.fun" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="rounded-lg bg-white/10 p-2 hover:bg-green-700">
              <FaTiktok className="h-5 w-5" />
            </a>
            <a href="https://www.youtube.com/@tikiti_fun" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="rounded-lg bg-white/10 p-2 hover:bg-green-700">
              <FaYoutube className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">For guests</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="font-semibold text-green-50 hover:underline" href="/events">Browse events</Link></li>
            <li><Link className="font-semibold text-green-50 hover:underline" href="/login">Sign in</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">For organizers</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="font-semibold text-green-50 hover:underline" href={SELL_PATH}>Sell tickets</Link></li>
            <li><Link className="font-semibold text-green-50 hover:underline" href="/sell#pricing">How pricing works</Link></li>
            <li><Link className="font-semibold text-green-50 hover:underline" href="/login?redirect=/dashboard/create-event">Create organizer account</Link></li>
            <li><a className="font-semibold text-green-50 hover:underline" href={SCANNER_APP_URL}>Tikiti Scanner</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Support</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="font-semibold text-green-50 hover:underline" href="/faq">FAQ</Link></li>
            <li><Link className="font-semibold text-green-50 hover:underline" href="/help">Help Centre</Link></li>
            <li><Link className="font-semibold text-green-50 hover:underline" href="/contact">Contact</Link></li>
            <li><Link className="font-semibold text-green-50 hover:underline" href="/terms">Terms</Link></li>
            <li><Link className="font-semibold text-green-50 hover:underline" href="/privacy">Privacy</Link></li>
          </ul>
          <form onSubmit={handleSubscribe} className="mt-6">
            <label htmlFor="footer-email" className="block text-sm font-semibold text-white">
              Email updates
            </label>
            <div className="mt-2 flex flex-col gap-2">
              <input
                id="footer-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-green-700)]"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}
              </button>
            </div>
            {subscribeMessage && <p className="mt-2 text-sm text-green-300" role="status">{subscribeMessage}</p>}
            {subscribeError && <p className="mt-2 text-sm text-red-300" role="alert">{subscribeError}</p>}
          </form>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-gray-400 sm:px-6">
          © {new Date().getFullYear()} IZIBONELO TECH PTY LTD. All rights reserved.
        </p>
        <p className="mx-auto max-w-6xl px-4 pb-6 text-sm text-gray-400 sm:px-6">{POWERED_BY_LINE}</p>
      </div>
    </footer>
  );
}
