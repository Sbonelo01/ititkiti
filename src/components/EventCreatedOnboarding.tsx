"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import AppStoreBadges from "@/components/AppStoreBadges";
import EventShareBar from "@/components/EventShareBar";
import { CtaButton, CtaLink } from "@/components/ui/CtaButton";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import { supabase } from "@/utils/supabaseClient";

type EmailNotice = "pending" | "sent" | "skipped";

type EventCreatedOnboardingProps = {
  eventId: string;
  eventTitle: string;
  dateLabel?: string;
  location: string;
  priceLabel: string;
  onGoToDashboard: () => void;
};

export default function EventCreatedOnboarding({
  eventId,
  eventTitle,
  dateLabel,
  location,
  priceLabel,
  onGoToDashboard,
}: EventCreatedOnboardingProps) {
  const copy = ORGANIZER_COPY.onboarding;
  const [emailNotice, setEmailNotice] = useState<EmailNotice>("pending");

  useEffect(() => {
    let cancelled = false;

    async function notify() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (!cancelled) setEmailNotice("skipped");
          return;
        }
        const res = await fetch("/api/organizer/welcome-email", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ eventId }),
        });
        const data = (await res.json()) as { sent?: boolean };
        if (!cancelled) setEmailNotice(data.sent ? "sent" : "skipped");
      } catch {
        if (!cancelled) setEmailNotice("skipped");
      }
    }

    notify();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white px-4 py-10">
      <div className="w-full max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center border border-gray-100">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircleIcon className="h-10 w-10 text-green-600" aria-hidden />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{copy.headline}</h1>
          <p className="text-gray-600 leading-relaxed">{copy.subhead(eventTitle)}</p>
          {emailNotice === "sent" && (
            <p className="mt-3 text-sm text-green-700">{copy.emailSent}</p>
          )}
        </div>

        <section className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{copy.shareTitle}</h2>
          <p className="text-sm text-gray-600 mt-1 mb-4">{copy.shareBody}</p>
          <EventShareBar
            eventId={eventId}
            title={eventTitle}
            dateLabel={dateLabel}
            location={location}
            priceLabel={priceLabel}
          />
        </section>

        <section className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-100">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
              <DevicePhoneMobileIcon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{copy.scannerTitle}</h2>
              <p className="text-sm text-gray-600 mt-1">{copy.scannerBody}</p>
            </div>
          </div>
          <AppStoreBadges layout="column" className="sm:flex-row sm:justify-start" />
        </section>

        <section className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-green-800">
              <DocumentTextIcon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{copy.invoiceTitle}</h2>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{copy.invoiceBody}</p>
              <Link
                href="/dashboard/invoices"
                className="inline-block mt-3 text-sm font-semibold text-green-700 hover:underline"
              >
                Open invoices
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <ShieldCheckIcon className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{copy.confidenceTitle}</h2>
          </div>
          <ul className="space-y-2">
            {copy.confidenceItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <CtaLink href={`/events/${eventId}`} variant="secondary" className="flex-1">
            {copy.viewEvent}
          </CtaLink>
          <CtaButton type="button" variant="primary" className="flex-1" onClick={onGoToDashboard}>
            {copy.goToDashboard}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
