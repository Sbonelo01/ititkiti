"use client";

import { useEffect, useState } from "react";
import { CheckIcon, LinkIcon, ShareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ScannerAppLink from "@/components/ScannerAppLink";
import CopyToast, { useCopyToast } from "@/components/CopyToast";
import TikitiWordmark from "@/components/TikitiWordmark";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import { patchEventChecklist } from "@/utils/eventChecklist";
import { getEventShareUrl } from "@/utils/eventShare";

type EventOnboardingModalProps = {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
  onFinished: () => void;
};

export default function EventOnboardingModal({
  eventId,
  eventTitle,
  open,
  onClose,
  onFinished,
}: EventOnboardingModalProps) {
  const copy = ORGANIZER_COPY.onboarding;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [copied, setCopied] = useState(false);
  const { message, showToast } = useCopyToast();
  const url = getEventShareUrl(eventId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      patchEventChecklist(eventId, { shareDone: true });
      showToast(ORGANIZER_COPY.toasts.linkCopied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this event link:", url);
    }
  };

  const shareLink = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: eventTitle, url });
        patchEventChecklist(eventId, { shareDone: true });
        setStep(2);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await copyLink();
    setStep(2);
  };

  const markScannerDone = () => {
    patchEventChecklist(eventId, { scannerDone: true });
    showToast(ORGANIZER_COPY.toasts.scannerTipSaved);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#F0FDF4] border-b border-[#22C55E]/20">
          <TikitiWordmark />
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-[#166534]">{step} / 3</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-white"
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900">
                {copy.step1Title}
              </h2>
              <p className="text-gray-600">{copy.step1Body}</p>
              <p className="text-sm font-medium text-gray-800">{eventTitle}</p>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="flex-1 text-xs text-gray-600 truncate">{url}</p>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#166534]"
                >
                  {copied ? <CheckIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                  {copied ? copy.copiedCta : copy.copyCta}
                </button>
              </div>
              <p className="text-xs text-gray-500">{copy.checklistShareHelper}</p>
              <button
                type="button"
                onClick={shareLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] text-white py-3 font-semibold hover:bg-[#15803D]"
              >
                <ShareIcon className="h-5 w-5" aria-hidden />
                {copy.shareEventCta}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#166534]">{copy.step2Title}</p>
              <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900">
                {copy.getScannerCta}
              </h2>
              <p className="text-gray-600">{ORGANIZER_COPY.empty.scannerNotConnected}</p>
              <p className="text-sm text-gray-600">{copy.step2Body}</p>
              <p className="text-sm text-gray-500">{copy.scannerTestHelper}</p>
              <ScannerAppLink
                className="w-full"
                onClick={() => patchEventChecklist(eventId, { scannerDone: true })}
              />
              <button
                type="button"
                onClick={markScannerDone}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                {copy.laterCta}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900">
                {copy.step3Title}
              </h2>
              <p className="text-gray-600 leading-relaxed">{copy.step3Body}</p>
              <p className="rounded-xl bg-[#F0FDF4] border border-[#22C55E]/30 px-4 py-3 text-sm font-semibold text-[#166534]">
                {copy.faceValueCallout}
              </p>
              <a
                href="/faq#invoices"
                className="inline-block text-sm font-semibold text-[#15803D] hover:underline"
              >
                {copy.howInvoicesWork}
              </a>
              <button
                type="button"
                onClick={onFinished}
                className="w-full rounded-xl bg-[#16A34A] text-white py-3 font-semibold hover:bg-[#15803D]"
              >
                {copy.gotItCta}
              </button>
            </div>
          )}
        </div>
      </div>
      <CopyToast message={message} />
    </div>
  );
}
