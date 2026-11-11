"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/utils/supabaseClient";
import { HomePageSkeleton } from "@/components/AppLoadingSkeleton";
import { LandingLink } from "@/components/landing/LandingLink";
import PricingSection from "@/components/landing/PricingSection";
import ScannerAppLink from "@/components/ScannerAppLink";
import { ORGANIZER_APP, SCANNER_APP_URL } from "@/constants/branding";
import { GET_TICKETS_LABEL, SELL_PATH } from "@/constants/landing";
import { formatEventWhen, selectUpcomingEvents } from "@/utils/upcomingEvents";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  total_tickets: number;
  organizer_id: string;
  poster_url?: string;
}

function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return `R${price.toFixed(2)}`;
}

const STEPS = [
  {
    title: "Create an organizer account",
    body: "Sign up, then continue into listing your event.",
  },
  {
    title: "List your event free",
    body: "Add ticket types, prices and quantities from one dashboard.",
  },
  {
    title: "Guests get instant QR tickets",
    body: "After payment, tickets land in their dashboard — no printing, no post.",
  },
  {
    title: "Scan and settle",
    body: "Check in at scan.tikiti.fun in any phone or tablet browser. After the event starts, generate a settlement invoice. You receive 100% of ticket face value.",
  },
] as const;

export default function HomePageClient({ initialEvents = [] }: { initialEvents?: Event[] }) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(initialEvents.length === 0);

  useEffect(() => {
    let cancelled = false;
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("created_at", { ascending: false });
        if (error || cancelled) return;
        setEvents(data || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <HomePageSkeleton />;
  }

  const upcoming = selectUpcomingEvents(events);

  return (
    <div className="bg-[#F7FBF8] text-gray-950">
      <section className="py-8 sm:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
              Paperless ticketing · South Africa
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              You keep 100% of the ticket price.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-gray-600">
              List your event free on Tikiti. Buyers pay a small platform fee at checkout — nothing is
              deducted from your ticket price. Guests get instant QR tickets. You scan at the door in
              the browser, no app download.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LandingLink href={SELL_PATH} className="w-full sm:w-auto">
                Start selling — it&apos;s free to list
              </LandingLink>
              <LandingLink href="#upcoming" variant="secondary" className="w-full sm:w-auto">
                Browse events
              </LandingLink>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-gray-700">
              <li className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Free to list</li>
              <li className="rounded-full border border-gray-200 bg-white px-3 py-1.5">You keep 100% face value</li>
              <li className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Free web scanner</li>
            </ul>
            <p className="mt-4 text-sm text-gray-600">
              Looking for tickets?{" "}
              <Link href="#upcoming" className="font-bold text-green-800 underline">
                Find events near you
              </Link>{" "}
              — pay securely and get a QR ticket on your phone.
            </p>
          </div>

          <div
            className="relative hidden min-h-[420px] overflow-hidden rounded-[28px] border border-green-200 bg-gradient-to-b from-green-50 to-white p-8 shadow-lg sm:block"
            aria-hidden="true"
          >
            <div className="max-w-[260px] rounded-2xl bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <Image src="/tikiti-icon.png" alt="" width={28} height={28} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Digital ticket
                </span>
              </div>
              <p className="text-lg font-extrabold">Your event</p>
              <p className="text-sm text-gray-500">QR on the guest’s phone · no printing</p>
              <p className="mt-3 text-sm font-extrabold text-green-800">You keep 100%</p>
              <div className="mt-4 border-t-2 border-dashed border-gray-200 pt-4">
                <div className="h-14 w-14 rounded-md bg-[repeating-linear-gradient(0deg,#14532d_0_4px,transparent_4px_8px),repeating-linear-gradient(90deg,#14532d_0_4px,transparent_4px_8px)]" />
              </div>
            </div>
            <div className="absolute bottom-6 right-6 w-40 rotate-6 rounded-[28px] bg-gray-950 p-2.5 shadow-xl">
              <div className="flex h-64 flex-col gap-2 rounded-[20px] bg-green-50 p-3">
                <p className="text-xs font-bold">Tikiti Scanner</p>
                <p className="text-[11px] text-green-800">{SCANNER_APP_URL.replace(/^https?:\/\//, "")} · web only</p>
                <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-green-700 text-[11px] font-bold text-green-800">
                  Align QR
                </div>
                <div className="rounded-xl bg-green-600 py-2 text-center text-xs font-extrabold text-white">
                  Valid ticket
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="upcoming" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
            For guests
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Upcoming events</h2>
              <p className="mt-2 max-w-xl text-lg text-gray-600">
                Browse, pay securely, and get an instant QR ticket on your phone.
              </p>
            </div>
            <Link href="/events" className="font-bold text-green-800 underline">
              Browse all events
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-xl font-bold">No upcoming events listed yet</h3>
              <p className="mt-2 text-gray-600">
                New listings appear here when the event date is still ahead. You can still browse the
                full events page.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <LandingLink href="/events" variant="secondary">Browse events</LandingLink>
                <LandingLink href={SELL_PATH}>List your event free</LandingLink>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {upcoming.map((event) => (
                <article key={event.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6">
                  <h3 className="text-xl font-extrabold">{event.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{formatEventWhen(event.date)}</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                  <p className="mt-3 text-xl font-extrabold">{formatPrice(event.price)}</p>
                  <p className="text-sm text-gray-500">{event.total_tickets} tickets available</p>
                  <LandingLink href={`/events/${event.id}`} variant="secondary" className="mt-4 self-start">
                    {GET_TICKETS_LABEL}
                  </LandingLink>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <PricingSection
        eyebrow="How pricing works"
        heading="Buyers pay the platform fee. You keep the ticket price."
        exampleMode="fee"
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
            From listing to the door
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Set up in minutes. Stay paperless the whole way.
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-gray-600">
            The same organizer path Tikiti already offers: list the event, sell QR tickets, scan at
            the door, then settle.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-green-100 font-extrabold text-green-900">
                  {index + 1}
                </div>
                <h3 className="text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-green-800 via-green-700 to-green-900 py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
              For event organizers
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your door team, in the browser
            </h2>
            <p className="mt-4 text-lg text-white/90">{ORGANIZER_APP.description}</p>
            <ul className="mt-6 space-y-2 text-white/95">
              {ORGANIZER_APP.features.map((feature) => (
                <li key={feature} className="pl-6 relative before:absolute before:left-0 before:top-2 before:h-3 before:w-3 before:rounded-full before:bg-[var(--brand-green)]">
                  {feature}
                </li>
              ))}
              <li className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-3 before:w-3 before:rounded-full before:bg-[var(--brand-green)]">
                Door team members can be invited from the event edit page
              </li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LandingLink href={SELL_PATH} variant="onGreen">
                Create an event — get scanner access
              </LandingLink>
              <ScannerAppLink variant="outline" label="Open scanner" />
            </div>
            <p className="mt-3 text-sm text-white/80">
              Free at {SCANNER_APP_URL.replace(/^https?:\/\//, "")} — web only, no app download required.
            </p>
          </div>
          <div className="mx-auto w-44 rounded-[28px] bg-gray-950 p-2.5 shadow-xl" aria-hidden="true">
            <div className="flex h-72 flex-col gap-2 rounded-[20px] bg-green-50 p-3 text-gray-950">
              <p className="text-xs font-bold">Tikiti Scanner</p>
              <p className="text-[11px] text-green-800">{SCANNER_APP_URL.replace(/^https?:\/\//, "")}</p>
              <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-green-700 text-[11px] font-bold text-green-800">
                Camera in the browser
              </div>
              <div className="rounded-xl bg-green-600 py-2 text-center text-xs font-extrabold text-white">
                Valid ticket
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-green-800 via-green-700 to-green-900 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to list your event?</h2>
          <p className="mt-3 text-lg text-white/90">
            Create your organizer account, list free, and go paperless from ticket sale to the front
            door. You keep 100% of ticket face value.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <LandingLink href={SELL_PATH} variant="onGreen">
              Start selling — it&apos;s free to list
            </LandingLink>
            <LandingLink href="#upcoming" variant="ghostOnGreen">
              Browse events
            </LandingLink>
          </div>
        </div>
      </section>
    </div>
  );
}
