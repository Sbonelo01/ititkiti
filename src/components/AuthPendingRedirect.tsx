"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  consumeAuthRedirectPath,
  isOAuthReturnOnWrongPath,
  oauthCallbackHref,
  peekAuthRedirectPath,
  resolvePostAuthPath,
} from "@/utils/authRedirect";
import { userHasOrganizerEvents } from "@/utils/postAuthLanding";
import { supabase } from "@/utils/supabaseClient";

function isSiteUrlFallbackPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname === "";
}

/**
 * If Supabase falls back to Site URL (`/` or leftover `/#`) instead of
 * `/auth/callback`, recover the session landing and continue to the stored path.
 */
export function AuthPendingRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith("/staff")) return;

    const currentPath = pathname || "/";
    const { origin, search, hash } = window.location;
    if (isOAuthReturnOnWrongPath(currentPath, search, hash)) {
      const next = peekAuthRedirectPath() ?? "/dashboard";
      window.location.replace(oauthCallbackHref(origin, next, search, hash));
      return;
    }

    if (currentPath === "/auth/callback" || !isSiteUrlFallbackPath(currentPath)) {
      return;
    }

    let handled = false;
    const goIfPending = (session: { user: { id: string } } | null) => {
      if (!session?.user?.id || handled) return;
      const stored = peekAuthRedirectPath();
      if (!stored) return;
      handled = true;
      void (async () => {
        const destination = await resolvePostAuthPath(
          session.user.id,
          stored,
          userHasOrganizerEvents
        );
        consumeAuthRedirectPath();
        router.replace(destination);
      })();
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      goIfPending(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        goIfPending(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
