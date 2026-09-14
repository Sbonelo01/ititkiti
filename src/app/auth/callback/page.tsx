"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPageSkeleton } from "@/components/AppLoadingSkeleton";
import { CtaLink } from "@/components/ui/CtaButton";
import {
  oauthErrorFromParams,
  safeAuthRedirectPath,
} from "@/utils/authRedirect";
import { supabase } from "@/utils/supabaseClient";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAuthRedirectPath(searchParams.get("next"));
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

    const go = () => {
      if (!cancelled) router.replace(next);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        go();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) go();
    });

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setError("Could not complete Google sign-in. Please try again.");
      }
    }, 12000);

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
