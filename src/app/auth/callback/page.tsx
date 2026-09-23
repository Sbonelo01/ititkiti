"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPageSkeleton } from "@/components/AppLoadingSkeleton";
import { CtaLink } from "@/components/ui/CtaButton";
import {
  consumeAuthRedirectPath,
  establishOAuthSession,
  GOOGLE_SIGN_IN_INCOMPLETE_ERROR,
  oauthErrorFromParams,
  peekAuthRedirectPath,
  resolvePostAuthPath,
  safeAuthRedirectPath,
} from "@/utils/authRedirect";
import { userHasOrganizerEvents } from "@/utils/postAuthLanding";
import { supabase } from "@/utils/supabaseClient";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAuthRedirectPath(
    searchParams.get("next") || peekAuthRedirectPath()
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(
      typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : ""
    );
    const oauthError = oauthErrorFromParams(
      new URLSearchParams(searchParams.toString()),
      hashParams
    );
    if (oauthError) {
      setError(oauthError);
      return;
    }

    let cancelled = false;
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled && !settled) {
        settled = true;
        setError(GOOGLE_SIGN_IN_INCOMPLETE_ERROR);
      }
    }, 12000);

    const succeed = async (userId: string) => {
      if (cancelled || settled) return;
      settled = true;
      window.clearTimeout(timeout);
      try {
        const destination = await resolvePostAuthPath(
          userId,
          next,
          userHasOrganizerEvents
        );
        if (cancelled) return;
        consumeAuthRedirectPath(searchParams.get("next"));
        router.replace(destination);
      } catch {
        if (!cancelled) {
          setError(GOOGLE_SIGN_IN_INCOMPLETE_ERROR);
        }
      }
    };

    const fail = (message: string) => {
      if (cancelled || settled) return;
      settled = true;
      window.clearTimeout(timeout);
      setError(message);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void succeed(session.user.id);
      }
    });

    const code =
      searchParams.get("code") ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("code")
        : null);

    void establishOAuthSession({
      code,
      getSession: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        return session?.user ? { user: { id: session.user.id } } : null;
      },
      exchangeCodeForSession: async (authCode) => {
        const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
        return {
          session: data.session?.user ? { user: { id: data.session.user.id } } : null,
          errorMessage: error?.message ?? null,
        };
      },
    }).then((result) => {
      if (cancelled || settled) return;
      if (result.session) {
        void succeed(result.session.user.id);
        return;
      }
      if (result.errorMessage) {
        fail(result.errorMessage);
      }
    }).catch(() => {
      fail(GOOGLE_SIGN_IN_INCOMPLETE_ERROR);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [next, router, searchParams]);

  if (!error) {
    return <AuthPageSkeleton />;
  }

  const loginHref = `/login?redirect=${encodeURIComponent(next)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Google sign-in failed</h1>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
        <CtaLink href={loginHref} variant="primary" className="w-full">
          Back to sign in
        </CtaLink>
        <p className="text-sm text-gray-500">
          Or{" "}
          <Link href="/" className="font-semibold text-green-700 hover:underline">
            return home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
