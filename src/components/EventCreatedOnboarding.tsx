"use client";

import { useEffect, useState } from "react";
import CopyToast, { useCopyToast } from "@/components/CopyToast";
import EventOnboardingModal from "@/components/EventOnboardingModal";
import TikitiWordmark from "@/components/TikitiWordmark";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import { supabase } from "@/utils/supabaseClient";

type EventCreatedOnboardingProps = {
  eventId: string;
  eventTitle: string;
  onGoToDashboard: () => void;
};

export default function EventCreatedOnboarding({
  eventId,
  eventTitle,
  onGoToDashboard,
}: EventCreatedOnboardingProps) {
  const [modalOpen, setModalOpen] = useState(true);
  const { message, showToast } = useCopyToast();

  useEffect(() => {
    showToast(ORGANIZER_COPY.toasts.eventCreated);
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    async function notify() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;
        await fetch("/api/organizer/welcome-email", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ eventId }),
        });
      } catch {
        /* in-app onboarding does not depend on email */
      }
    }
    notify();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

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
