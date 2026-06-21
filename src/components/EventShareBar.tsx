"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  ShareIcon,
  LinkIcon,
  CheckIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { FaWhatsapp, FaFacebook, FaXTwitter, FaLinkedin } from "react-icons/fa6";
import {
  buildEmailShareUrl,
  buildEventShareMessage,
  buildFacebookShareUrl,
  buildLinkedInShareUrl,
  buildWhatsAppShareUrl,
  buildXShareUrl,
  getEventShareUrl,
  type EventShareInput,
} from "@/utils/eventShare";

type EventShareBarProps = EventShareInput & {
  variant?: "hero" | "card";
  compact?: boolean;
};

const socialButtonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2";

export default function EventShareBar({
  eventId,
  title,
  dateLabel,
  location,
  priceLabel,
  variant = "card",
  compact = false,
}: EventShareBarProps) {
  const [copied, setCopied] = useState(false);
  const url = getEventShareUrl(eventId);
  const message = buildEventShareMessage({ eventId, title, dateLabel, location, priceLabel });
  const tweetText = `Get tickets: ${title}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this event link:", url);
    }
  }, [url]);

  const nativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await copyLink();
  }, [copyLink, message, title, url]);

  const isHero = variant === "hero";

  const iconBtn = (href: string, label: string, children: ReactNode, className: string) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`${socialButtonBase} ${className}`}
    >
      {children}
    </a>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={nativeShare}
          className={`${socialButtonBase} bg-green-600 text-white hover:bg-green-700 px-3 py-2 text-sm`}
        >
          <ShareIcon className="h-4 w-4" aria-hidden />
          Share
        </button>
        <button
          type="button"
          onClick={copyLink}
          className={`${socialButtonBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-3 py-2 text-sm`}
        >
          {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        isHero
          ? "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5"
          : "rounded-2xl bg-white border border-gray-100 shadow-sm p-4 sm:p-5"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <p className={`text-sm font-bold ${isHero ? "text-white" : "text-gray-900"}`}>
            Share this event
          </p>
          <p className={`text-xs mt-0.5 ${isHero ? "text-white/75" : "text-gray-500"}`}>
            Spread the word — sell more tickets
          </p>
        </div>
        <button
          type="button"
          onClick={nativeShare}
          className={`${socialButtonBase} shrink-0 px-4 py-2.5 text-sm ${
            isHero
              ? "bg-white text-green-700 hover:bg-green-50"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          <ShareIcon className="h-5 w-5" aria-hidden />
          Share link
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {iconBtn(
          buildWhatsAppShareUrl(message),
          "Share on WhatsApp",
          <>
            <FaWhatsapp className="h-5 w-5" aria-hidden />
            <span className="text-sm">WhatsApp</span>
          </>,
          isHero
            ? "bg-[#25D366] text-white hover:brightness-110 px-3 py-2.5"
            : "bg-[#25D366] text-white hover:brightness-110 px-3 py-2.5"
        )}
        {iconBtn(
          buildFacebookShareUrl(url),
          "Share on Facebook",
          <>
            <FaFacebook className="h-5 w-5" aria-hidden />
            <span className="text-sm">Facebook</span>
          </>,
          isHero
            ? "bg-[#1877F2] text-white hover:brightness-110 px-3 py-2.5"
            : "bg-[#1877F2] text-white hover:brightness-110 px-3 py-2.5"
        )}
        {iconBtn(
          buildXShareUrl(url, tweetText),
          "Share on X",
          <>
            <FaXTwitter className="h-5 w-5" aria-hidden />
            <span className="text-sm">X</span>
          </>,
          isHero
            ? "bg-gray-900 text-white hover:bg-gray-800 px-3 py-2.5"
            : "bg-gray-900 text-white hover:bg-gray-800 px-3 py-2.5"
        )}
        {iconBtn(
          buildLinkedInShareUrl(url),
          "Share on LinkedIn",
          <>
            <FaLinkedin className="h-5 w-5" aria-hidden />
            <span className="text-sm hidden min-[400px]:inline">LinkedIn</span>
          </>,
          isHero
            ? "bg-[#0A66C2] text-white hover:brightness-110 px-3 py-2.5"
            : "bg-[#0A66C2] text-white hover:brightness-110 px-3 py-2.5"
        )}
        {iconBtn(
          buildEmailShareUrl(`Tickets: ${title}`, message),
          "Share via email",
          <>
            <EnvelopeIcon className="h-5 w-5" aria-hidden />
            <span className="text-sm">Email</span>
          </>,
          isHero
            ? "bg-white/20 text-white hover:bg-white/30 px-3 py-2.5"
            : "border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 px-3 py-2.5"
        )}
        <button
          type="button"
          onClick={copyLink}
          className={`${socialButtonBase} px-3 py-2.5 text-sm col-span-2 sm:col-span-1 ${
            isHero
              ? "bg-white/20 text-white hover:bg-white/30"
              : "border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100"
          }`}
        >
          {copied ? (
            <CheckIcon className="h-5 w-5 text-green-400" aria-hidden />
          ) : (
            <LinkIcon className="h-5 w-5" aria-hidden />
          )}
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
