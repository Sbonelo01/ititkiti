"use client";

import { useEffect, useState } from "react";
import CopyToast, { useCopyToast } from "@/components/CopyToast";
import EventOnboardingModal from "@/components/EventOnboardingModal";
import TikitiWordmark from "@/components/TikitiWordmark";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import { supabase } from "@/utils/supabaseClient";

type WelcomeEmailStatus = {
  sent: boolean;
  reason?: string;
};

type EventCreatedOnboardingProps = {
  eventId: string;
  eventTitle: string;
  welcomeEmail?: WelcomeEmailStatus | null;
  onGoToDashboard: () => void;
};

const DO_NOT_RETRY = new Set([
  "not_configured",
  "no_recipient",
  "already_sent",
  "in_flight",
  "forbidden",
  "not_found",
]);

function shouldRetryWelcomeEmail(welcome: WelcomeEmailStatus | null | undefined): boolean {
  if (!welcome) return true;
  if (welcome.sent) return false;
  if (!welcome.reason) return true;
  if (DO_NOT_RETRY.has(welcome.reason)) return false;
  if (welcome.reason.startsWith("resend_http_4")) return false;
  return true;
}

export default function EventCreatedOnboarding({
  eventId,
  eventTitle,
  welcomeEmail = null,
  onGoToDashboard,
}: EventCreatedOnboardingProps) {
  const [modalOpen, setModalOpen] = useState(true);
  const { message, showToast } = useCopyToast();

  useEffect(() => {
    showToast(ORGANIZER_COPY.toasts.eventCreated);
  }, [showToast]);

  useEffect(() => {
    if (!shouldRetryWelcomeEmail(welcomeEmail)) return;
    async function notify() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.error(
            "[organizer-welcome-email] no session for backup send; the create request should already have sent"
          );
          return;
        }
        const res = await fetch("/api/organizer/welcome-email", {
          method: "POST",
          keepalive: true,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ eventId }),
        });
        if (!res.ok) {
          console.error("[organizer-welcome-email] backup send failed", res.status);
        }
      } catch (err) {
        console.error("[organizer-welcome-email] backup send failed", err);
      }
    }
    void notify();
  }, [eventId, welcomeEmail]);

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center space-y-4">
        <TikitiWordmark />
        <h1 className="text-2xl font-bold text-gray-900">{ORGANIZER_COPY.onboarding.headline}</h1>
        <p className="text-gray-600">{eventTitle}</p>
        {!modalOpen && (
          <button
            type="button"
            onClick={onGoToDashboard}
            className="w-full rounded-xl bg-[#16A34A] text-white py-3 font-semibold hover:bg-[#15803D]"
          >
            {ORGANIZER_COPY.onboarding.gotItCta}
          </button>
        )}
      </div>
      <EventOnboardingModal
        eventId={eventId}
        eventTitle={eventTitle}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onFinished={onGoToDashboard}
      />
      <CopyToast message={message} />
    </div>
  );
}
