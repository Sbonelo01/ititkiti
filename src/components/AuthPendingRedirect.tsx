"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  consumeAuthRedirectPath,
  isOAuthReturnOnWrongPath,
  oauthCallbackHref,
  peekAuthRedirectPath,
  safeAuthRedirectPath,
} from "@/utils/authRedirect";
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
    const goIfPending = (hasSession: boolean) => {
      if (!hasSession || handled) return;
      const stored = peekAuthRedirectPath();
      if (!stored) return;
      handled = true;
      consumeAuthRedirectPath();
      router.replace(safeAuthRedirectPath(stored));
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      goIfPending(Boolean(session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        goIfPending(Boolean(session));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
