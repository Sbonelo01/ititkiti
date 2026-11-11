"use client";

import { useEffect, useState } from "react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import {
  publicOrganizerCardFromParts,
  telHref,
  type PublicOrganizerCard,
} from "@/lib/events/publicOrganizer";

type OrganizedBySectionProps = {
  organizer: PublicOrganizerCard;
};

export default function OrganizedBySection({ organizer }: OrganizedBySectionProps) {
  const card = publicOrganizerCardFromParts(organizer);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [organizer.logoUrl]);

  if (!card) return null;

  const logoUrl = card.logoUrl;
  const phoneHref = card.publicPhone ? telHref(card.publicPhone) : null;

  return (
    <section
      aria-labelledby="organised-by-heading"
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3 min-w-0">
        {logoUrl && !logoFailed ? (
          // Public logos are arbitrary http(s) URLs, outside next/image remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl object-cover border border-gray-100 bg-gray-50"
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <BuildingOfficeIcon className="h-6 w-6" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2
            id="organised-by-heading"
            className="text-xs font-semibold uppercase tracking-wide text-green-700"
          >
            Organised by
          </h2>
          <p className="mt-0.5 text-base sm:text-lg font-semibold text-gray-900 break-words">
            {card.displayName}
          </p>
          {card.bio ? (
            <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap break-words">
              {card.bio}
            </p>
          ) : null}
          {card.websiteUrl || card.publicEmail || phoneHref ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {card.websiteUrl ? (
                <li className="min-w-0">
                  <a
                    href={card.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-green-700 hover:text-green-800 underline decoration-green-200 underline-offset-2 break-all"
                  >
                    {card.websiteUrl}
                  </a>
                </li>
              ) : null}
              {card.publicEmail ? (
                <li className="min-w-0">
                  <a
                    href={`mailto:${encodeURIComponent(card.publicEmail)}`}
                    className="font-medium text-gray-800 hover:text-green-800 break-all"
                  >
                    {card.publicEmail}
                  </a>
                </li>
              ) : null}
              {phoneHref ? (
                <li className="min-w-0">
                  <a
                    href={phoneHref}
                    className="font-medium text-gray-800 hover:text-green-800 break-words"
                  >
                    {card.publicPhone}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
