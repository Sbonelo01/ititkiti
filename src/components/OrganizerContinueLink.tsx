"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CREATE_EVENT_PATH, ORGANIZER_SIGNUP_PATH } from "@/constants/landing";
import { landingLinkClass, type LandingVariant } from "@/components/landing/LandingLink";
import { supabase } from "@/utils/supabaseClient";

type OrganizerContinueLinkProps = {
  className?: string;
  variant?: LandingVariant;
  loggedOutLabel: string;
  loggedInLabel?: string;
};

export default function OrganizerContinueLink({
  className = "",
  variant = "primary",
  loggedOutLabel,
  loggedInLabel = "List your event",
}: OrganizerContinueLinkProps) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSignedIn(Boolean(data.session));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href={signedIn ? CREATE_EVENT_PATH : ORGANIZER_SIGNUP_PATH}
      className={landingLinkClass(variant, className)}
    >
      {signedIn ? loggedInLabel : loggedOutLabel}
    </Link>
  );
}
