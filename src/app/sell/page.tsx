import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import OrganizerContinueLink from "@/components/OrganizerContinueLink";
import { LandingLink } from "@/components/landing/LandingLink";
import PricingSection from "@/components/landing/PricingSection";
import ScannerAppLink from "@/components/ScannerAppLink";
import { BRAND, SCANNER_APP_URL } from "@/constants/branding";
import { computeBuyerServiceFeeZar, formatZar } from "@/constants/pricing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: `Sell tickets | ${BRAND.name}`,
  description:
    "List events free on Tikiti. Organizers keep 100% of ticket face value. Buyers pay the platform fee at checkout. Scan tickets in the browser.",
  path: "/sell",
});

const STEPS = [
  {
    title: "Create your organizer account",
    body: "Arriving from this page keeps you on organizer sign-up.",
  },
  {
    title: "List the event",
    body: "Name, date, venue, ticket types, prices and quantities. Listing is free.",
  },
  {
    title: "Share and sell",
    body: "Guests pay the ticket price plus the published buyer fee, then receive a QR ticket.",
  },
  {
    title: "Scan, then invoice",
    body: "Open the scanner on any phone or tablet. After the event starts, generate a settlement invoice for 100% of face value sold.",
  },
] as const;

export default function SellPage() {
  const exampleFace = 200;
  const exampleFee = computeBuyerServiceFeeZar(exampleFace);

  return (
    <div className="bg-[#F7FBF8] text-gray-950">
      <section className="py-8 sm:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
              For event organizers
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              List free. Keep 100%. Scan at the door.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-gray-600">
              Tikiti is paperless ticketing for South African organizers. You receive 100% of ticket
              face value. Platform fees are paid by buyers at checkout. The web scanner is included
              with every organizer account — no download required.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <OrganizerContinueLink
                loggedOutLabel="Create organizer account"
                className="w-full sm:w-auto"
              />
              <LandingLink href="#pricing" variant="secondary" className="w-full sm:w-auto">
                See how pricing works
              </LandingLink>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-gray-700">
              <li className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Listing is free</li>
              <li className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Card processing included in the buyer fee</li>
              <li className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Multiple ticket types</li>
              <li className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Settlement invoice after the event starts</li>
            </ul>
            <p className="mt-4 text-sm text-gray-600">
              Want tickets instead?{" "}
              <Link href="/events" className="font-bold text-green-800 underline">
                Browse events
              </Link>
              .
            </p>
          </div>
          <div className="rounded-[28px] border border-green-200 bg-gradient-to-b from-green-50 to-white p-6 shadow-lg">
            <div className="rounded-2xl bg-white p-5 shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <Image src="/tikiti-icon.png" alt="" width={28} height={28} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Example fee
                </span>
              </div>
              <h2 className="text-lg font-extrabold">A {formatZar(exampleFace)} ticket</h2>
              <p className="text-sm text-gray-500">
                Date, venue, ticket types and quantities are set when you list the event.
              </p>
              <dl className="mt-4 text-sm">
                <div className="flex justify-between border-b border-gray-100 py-2">
                  <dt>Ticket face value</dt>
                  <dd className="font-bold">{formatZar(exampleFace)}</dd>
                </div>
                <div className="flex justify-between border-b border-gray-100 py-2">
                  <dt>Buyer platform fee</dt>
                  <dd className="font-bold">{formatZar(exampleFee)} (paid by buyer)</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt>You receive</dt>
                  <dd className="font-bold">{formatZar(exampleFace)} — 100%</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <PricingSection
        eyebrow="How pricing works"
        heading="Nothing is deducted from your ticket price."
        lede="A small platform fee is added at checkout to fund secure payments, QR tickets and support. Organizers keep their full ticket price."
        exampleMode="total"
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700">
            For organizers
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Create, sell, scan, settle.
          </h2>
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
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <OrganizerContinueLink loggedOutLabel="Create organizer account" />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-green-800 via-green-700 to-green-900 py-16 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Free web scanner, included.</h2>
            <p className="mt-4 text-lg text-white/90">
              Open Tikiti Scanner at {SCANNER_APP_URL.replace(/^https?:\/\//, "")} in your phone
              browser and sign in with your Tikiti account. Organizers scan their events. Door team
              members need an invite from the organizer on the event edit page.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <OrganizerContinueLink loggedOutLabel="Create organizer account" variant="onGreen" />
              <ScannerAppLink variant="outline" label="Open scanner" />
            </div>
          </div>
          <ul className="space-y-3 text-white/95">
            <li>No app store download</li>
            <li>Works on phone or tablet browser</li>
            <li>Real-time validation at the door</li>
            <li>Zero printed stubs</li>
          </ul>
        </div>
      </section>

      <section className="py-14 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight">Create your organizer account</h2>
          <p className="mt-3 text-lg text-gray-600">
            Next you’ll list your event. Listing is free, and you keep 100% of ticket face value.
          </p>
          <div className="mt-6 flex justify-center">
            <OrganizerContinueLink loggedOutLabel="Create organizer account" className="px-6 py-4 text-base" />
          </div>
        </div>
      </section>
    </div>
  );
}
